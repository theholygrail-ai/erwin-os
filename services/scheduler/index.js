require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { logger } = require('@erwin-os/shared/logger');
const { config } = require('@erwin-os/shared/config');
const { dynamoClient, s3Client } = require('@erwin-os/shared/aws-clients');
const { groqClient } = require('@erwin-os/shared/groq-client');
const { JOB_STATUSES } = require('@erwin-os/schemas');
const { generateStandupAudio } = require('./tts');
const { sendWhatsAppAudio } = require('./whatsapp');
const { GmailConnector } = require('@erwin-os/connectors/gmail');

async function runMorningStandup() {
  logger.info('scheduler', 'Running morning standup generation');

  try {
    const allJobs = await dynamoClient.scan(config.aws.tables.jobs);
    const today = new Date().toISOString().split('T')[0];
    const todayJobs = allJobs.filter(j => j.created_at?.startsWith(today));

    const byStatus = {};
    for (const job of allJobs) {
      const s = job.status || 'unknown';
      if (!byStatus[s]) byStatus[s] = [];
      byStatus[s].push(job);
    }

    const standupData = {
      date: today,
      new_today: todayJobs.length,
      in_progress: (byStatus[JOB_STATUSES.IN_PROGRESS] || []).length,
      completed: (byStatus[JOB_STATUSES.COMPLETED] || []).length,
      blocked: (byStatus[JOB_STATUSES.VERIFICATION_FAILED] || []).length,
      total_active: allJobs.filter(j =>
        ![JOB_STATUSES.SUBMITTED, JOB_STATUSES.ARCHIVED].includes(j.status)
      ).length,
      top_priorities: allJobs
        .filter(j => ![JOB_STATUSES.SUBMITTED, JOB_STATUSES.ARCHIVED, JOB_STATUSES.COMPLETED].includes(j.status))
        .sort((a, b) => (a.priority || 99) - (b.priority || 99))
        .slice(0, 3),
      new_tasks: todayJobs.slice(0, 5),
      blocked_tasks: (byStatus[JOB_STATUSES.VERIFICATION_FAILED] || []).slice(0, 3),
    };

    const standupText = await generateStandupNarrative(standupData);
    logger.info('scheduler', 'Standup text generated', { length: standupText.length });

    const audioBuffer = await generateStandupAudio(standupText);

    if (audioBuffer) {
      const audioKey = `standups/${today}/standup-audio.ogg`;
      await s3Client.putObject(audioKey, audioBuffer, 'audio/ogg');
      logger.info('scheduler', 'Audio uploaded to S3', { key: audioKey });

      if (config.whatsapp.accessToken && config.whatsapp.recipientNumber) {
        await sendWhatsAppAudio(audioKey, standupText);
        logger.info('scheduler', 'WhatsApp standup sent');
      }
    }

    const standupKey = `standups/${today}/standup.json`;
    await s3Client.putObject(standupKey, JSON.stringify({ ...standupData, text: standupText, generated_at: new Date().toISOString() }));

    logger.info('scheduler', 'Morning standup complete');
  } catch (err) {
    logger.error('scheduler', 'Morning standup failed', { error: err.message, stack: err.stack });
  }
}

async function generateStandupNarrative(data) {
  try {
    const result = await groqClient.chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are Erwin OS, an AI assistant generating a concise daily standup voice note for Erwin Mothoa, a Technical Writer. Speak naturally as if delivering a morning briefing. Keep it under 90 seconds when read aloud. Be direct and actionable.',
        },
        {
          role: 'user',
          content: `Generate a morning standup summary for ${data.date}:

New tasks today: ${data.new_today}
${data.new_tasks.map(t => `  - ${t.title} (from ${t.source_system})`).join('\n')}

In progress: ${data.in_progress}
Completed (awaiting review): ${data.completed}
Blocked: ${data.blocked}
${data.blocked_tasks.map(t => `  - ${t.title}: ${t.review_notes || 'verification failed'}`).join('\n')}

Top priorities:
${data.top_priorities.map((p, i) => `  ${i + 1}. ${p.title}`).join('\n')}

Total active tasks: ${data.total_active}

Generate a natural spoken standup summary.`,
        },
      ],
      maxTokens: 1024,
      temperature: 0.6,
    });

    return result.content;
  } catch (err) {
    logger.error('scheduler', 'LLM standup generation failed, using template', { error: err.message });
    return generateFallbackText(data);
  }
}

function generateFallbackText(data) {
  const lines = [
    `Good morning Erwin. Daily standup for ${data.date}.`,
    `${data.new_today} new tasks. ${data.in_progress} in progress. ${data.completed} ready for review.`,
  ];
  if (data.blocked > 0) lines.push(`${data.blocked} tasks blocked and need attention.`);
  if (data.top_priorities.length > 0) {
    lines.push(`Top priority: ${data.top_priorities[0].title}.`);
  }
  lines.push(`${data.total_active} total active tasks. Have a productive day.`);
  return lines.join(' ');
}

async function renewGmailWatch() {
  logger.info('scheduler', 'Renewing Gmail watch');
  try {
    const connector = new GmailConnector();
    await connector.setupWatch();
    logger.info('scheduler', 'Gmail watch renewed');
  } catch (err) {
    logger.error('scheduler', 'Gmail watch renewal failed', { error: err.message });
  }
}

const action = process.argv[2] || 'standup';

switch (action) {
  case 'standup':
    runMorningStandup().then(() => process.exit(0)).catch(() => process.exit(1));
    break;
  case 'gmail-renew':
    renewGmailWatch().then(() => process.exit(0)).catch(() => process.exit(1));
    break;
  default:
    logger.error('scheduler', `Unknown action: ${action}`);
    process.exit(1);
}
