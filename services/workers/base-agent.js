const { groqClient } = require('@erwin-os/shared/groq-client');
const { logger } = require('@erwin-os/shared/logger');
const { buildSystemPrompt, getAgentTools } = require('@erwin-os/prompts');
const { s3Client } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { v4: uuidv4 } = require('uuid');

class BaseAgent {
  constructor({ context, job, mcpHost, browserRouter }, agentName) {
    this.context = context;
    this.job = job;
    this.mcpHost = mcpHost;
    this.browserRouter = browserRouter;
    this.agentName = agentName;
    this.systemPrompt = buildSystemPrompt(agentName);
    this.tools = getAgentTools(agentName);
    this.tokensUsed = 0;
    this.conversationHistory = [];
  }

  async chat(userMessage, { jsonMode = false, maxTokens = 8192, temperature = 0.3 } = {}) {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory,
    ];

    const result = await groqClient.chatCompletion({
      messages,
      maxTokens,
      temperature,
      jsonMode,
    });

    this.tokensUsed += (result.usage.total_tokens || 0);
    this.conversationHistory.push({ role: 'assistant', content: result.content });

    logger.debug(this.agentName, 'LLM response', {
      tokens: result.usage,
      finishReason: result.finishReason,
    });

    return result.content;
  }

  async chatJson(userMessage, options = {}) {
    const response = await this.chat(userMessage, { ...options, jsonMode: true });
    try {
      return JSON.parse(response);
    } catch {
      logger.warn(this.agentName, 'Failed to parse JSON response, attempting extraction');
      const match = response.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Agent response was not valid JSON');
    }
  }

  async saveToS3(key, content, contentType = 'application/json') {
    const fullKey = `jobs/${this.job.job_id}/${this.agentName}/${key}`;
    await s3Client.putObject(fullKey, content, contentType);
    return `s3://${config.aws.s3Bucket}/${fullKey}`;
  }

  buildJobContext() {
    return [
      `## Job Details`,
      `- **Job ID:** ${this.job.job_id}`,
      `- **Title:** ${this.job.title}`,
      `- **Description:** ${this.job.description || 'No description provided'}`,
      `- **Document Type:** ${this.job.document_type}`,
      `- **Source System:** ${this.job.source_system}`,
      `- **Source Reference:** ${JSON.stringify(this.job.source_ref || {})}`,
      `- **Priority:** ${this.job.priority}`,
    ].join('\n');
  }

  async execute() {
    throw new Error(`Agent ${this.agentName} must implement execute()`);
  }
}

module.exports = { BaseAgent };
