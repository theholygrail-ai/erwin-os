require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { logger } = require('@erwin-os/shared/logger');
const { config } = require('@erwin-os/shared/config');
const { sqsClient, dynamoClient } = require('@erwin-os/shared/aws-clients');
const { JOB_STATUSES, RUN_STATUSES, AGENT_NAMES, createRun, createRunStep } = require('@erwin-os/schemas');
const { McpToolHost } = require('@erwin-os/mcp/mcp-host');
const { BrowserRouter } = require('@erwin-os/mcp/browser-router');
const { v4: uuidv4 } = require('uuid');

const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 10_000;
const MAX_CONCURRENT_JOBS = 3;

let running = false;
let activeJobs = 0;
let mcpHost = null;
let browserRouter = null;

async function initialize() {
  mcpHost = new McpToolHost();
  await mcpHost.initializeDefaultServers();
  browserRouter = new BrowserRouter(mcpHost);
  logger.info('orchestrator', 'Initialized MCP host and browser router');
}

async function pollForJobs() {
  if (activeJobs >= MAX_CONCURRENT_JOBS) return;

  const messages = await sqsClient.receiveMessages(
    config.aws.sqsJobQueueUrl,
    MAX_CONCURRENT_JOBS - activeJobs,
    5
  );

  for (const message of messages) {
    activeJobs++;
    processJob(message).finally(() => { activeJobs--; });
  }
}

async function processJob(message) {
  const { job_id } = message.body;

  try {
    logger.info('orchestrator', `Processing job ${job_id}`);

    const job = await dynamoClient.get(config.aws.tables.jobs, { job_id });
    if (!job) {
      logger.warn('orchestrator', `Job ${job_id} not found`);
      await sqsClient.deleteMessage(config.aws.sqsJobQueueUrl, message.receiptHandle);
      return;
    }

    const retryCount = job.retry_count || 0;
    if (retryCount >= MAX_RETRIES) {
      logger.warn('orchestrator', `Job ${job_id} exceeded max retries, escalating`);
      await updateJobStatus(job_id, JOB_STATUSES.VERIFICATION_FAILED, {
        review_notes: `Exceeded maximum retry count (${MAX_RETRIES}). Manual intervention required.`,
      });
      await sqsClient.deleteMessage(config.aws.sqsJobQueueUrl, message.receiptHandle);
      return;
    }

    await updateJobStatus(job_id, JOB_STATUSES.IN_PROGRESS);

    const run = createRun({
      runId: uuidv4(),
      jobId: job_id,
      agentName: AGENT_NAMES.ORCHESTRATOR,
    });

    const pipeline = [
      { agent: AGENT_NAMES.RESEARCHER, step: 0 },
      { agent: AGENT_NAMES.PLANNER, step: 1 },
      { agent: AGENT_NAMES.BUILDER, step: 2 },
      { agent: AGENT_NAMES.VERIFIER, step: 3 },
    ];

    run.steps = pipeline.map(({ agent, step }) =>
      createRunStep({ stepIndex: step, agentName: agent })
    );

    await dynamoClient.put(config.aws.tables.runs, run);

    let context = {
      job,
      evidencePack: null,
      documentPlan: null,
      draftArtifact: null,
      verificationResult: null,
    };

    for (const { agent, step } of pipeline) {
      logger.info('orchestrator', `Dispatching ${agent} for job ${job_id} (step ${step})`);

      const stepStart = Date.now();
      await updateRunStep(run.run_id, step, { status: RUN_STATUSES.RUNNING, started_at: new Date().toISOString() });

      try {
        const result = await dispatchAgent(agent, context, job);
        context = { ...context, ...result };

        await updateRunStep(run.run_id, step, {
          status: RUN_STATUSES.COMPLETED,
          output_uri: result.outputUri || null,
          tokens_used: result.tokensUsed || 0,
          duration_ms: Date.now() - stepStart,
          completed_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('orchestrator', `Agent ${agent} failed for job ${job_id}`, { error: err.message });

        await updateRunStep(run.run_id, step, {
          status: RUN_STATUSES.FAILED,
          error: err.message,
          duration_ms: Date.now() - stepStart,
          completed_at: new Date().toISOString(),
        });

        await updateJobStatus(job_id, JOB_STATUSES.VERIFICATION_FAILED, {
          review_notes: `Agent ${agent} failed: ${err.message}`,
          retry_count: retryCount + 1,
        });

        if (retryCount + 1 < MAX_RETRIES) {
          await sqsClient.sendMessage(config.aws.sqsJobQueueUrl, { job_id });
        }

        await sqsClient.deleteMessage(config.aws.sqsJobQueueUrl, message.receiptHandle);
        return;
      }
    }

    if (context.verificationResult?.passed) {
      await updateJobStatus(job_id, JOB_STATUSES.COMPLETED, {
        draft_artifact_uri: context.draftArtifact?.uri,
        verification_result: context.verificationResult,
      });
    } else {
      await updateJobStatus(job_id, JOB_STATUSES.VERIFICATION_FAILED, {
        verification_result: context.verificationResult,
        review_notes: context.verificationResult?.repairNotes || 'Verification failed',
        retry_count: retryCount + 1,
      });

      if (retryCount + 1 < MAX_RETRIES) {
        await sqsClient.sendMessage(config.aws.sqsJobQueueUrl, { job_id });
      }
    }

    await sqsClient.deleteMessage(config.aws.sqsJobQueueUrl, message.receiptHandle);
    logger.info('orchestrator', `Completed processing job ${job_id}`);

  } catch (err) {
    logger.error('orchestrator', `Fatal error processing job ${message.body?.job_id}`, {
      error: err.message,
      stack: err.stack,
    });
  }
}

async function dispatchAgent(agentName, context, job) {
  const { runAgent } = require('@erwin-os/workers');
  return runAgent(agentName, { context, job, mcpHost, browserRouter });
}

async function updateJobStatus(jobId, status, extraFields = {}) {
  const updateParts = ['#s = :status', 'updated_at = :now'];
  const values = { ':status': status, ':now': new Date().toISOString() };
  const names = { '#s': 'status' };

  for (const [key, value] of Object.entries(extraFields)) {
    updateParts.push(`${key} = :${key}`);
    values[`:${key}`] = value;
  }

  await dynamoClient.update(
    config.aws.tables.jobs,
    { job_id: jobId },
    `SET ${updateParts.join(', ')}`,
    values,
    names
  );
}

async function updateRunStep(runId, stepIndex, updates) {
  const updateParts = [];
  const values = {};

  for (const [key, value] of Object.entries(updates)) {
    updateParts.push(`steps[${stepIndex}].${key} = :step_${key}`);
    values[`:step_${key}`] = value;
  }

  if (updateParts.length === 0) return;

  await dynamoClient.update(
    config.aws.tables.runs,
    { run_id: runId },
    `SET ${updateParts.join(', ')}`,
    values
  );
}

async function start() {
  running = true;
  logger.info('orchestrator', 'Starting orchestrator...');
  await initialize();

  while (running) {
    try {
      await pollForJobs();
    } catch (err) {
      logger.error('orchestrator', 'Poll cycle error', { error: err.message });
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

async function stop() {
  running = false;
  if (browserRouter) await browserRouter.shutdown();
  if (mcpHost) await mcpHost.stopAll();
  logger.info('orchestrator', 'Orchestrator stopped');
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);

start().catch(err => {
  logger.error('orchestrator', 'Fatal startup error', { error: err.message });
  process.exit(1);
});
