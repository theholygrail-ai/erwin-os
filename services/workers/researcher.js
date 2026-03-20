const { BaseAgent } = require('./base-agent');
const { AGENT_NAMES } = require('@erwin-os/schemas');
const { logger } = require('@erwin-os/shared/logger');
const { v4: uuidv4 } = require('uuid');

class ResearcherAgent extends BaseAgent {
  constructor(params) {
    super(params, AGENT_NAMES.RESEARCHER);
    this.connectors = params.connectors || {};
  }

  async execute() {
    const startTime = Date.now();
    logger.info('researcher', `Starting research for job ${this.job.job_id}`);

    const researchPlan = await this.chatJson(`
${this.buildJobContext()}

${this.context.verificationResult ? `## Previous Verification Feedback\n${JSON.stringify(this.context.verificationResult.repairNotes)}` : ''}

Based on the job details above, create a research plan. Identify what sources to search and what information to gather.

Respond as JSON:
{
  "search_queries": {
    "clickup": ["query1", "query2"],
    "slack": ["query1"],
    "gmail": ["query1"],
    "drive": ["query1"],
    "web": ["query1"]
  },
  "expected_sources": ["source description 1", "source description 2"],
  "key_questions": ["question 1", "question 2"]
}
    `);

    const sources = [];
    const searchSystemsUsed = [];

    if (researchPlan.search_queries?.clickup) {
      searchSystemsUsed.push('clickup');
      for (const query of researchPlan.search_queries.clickup) {
        try {
          const clickup = this.connectors.clickup;
          if (clickup) {
            const results = await clickup.searchTasks(this.job.source_ref?.[0]?.teamId || '', query);
            const tasks = results.tasks || [];
            for (const task of tasks.slice(0, 5)) {
              sources.push({
                source_id: uuidv4(),
                type: 'clickup_task',
                id: task.id,
                title: task.name || query,
                content_uri: null,
                content: `${task.name}: ${task.description || task.text_content || ''}`.substring(0, 3000),
                relevance_score: 0.8,
                query,
              });
            }
          } else {
            sources.push(this.createPlaceholderSource('clickup_search', query, 0.8));
          }
        } catch (err) {
          logger.warn('researcher', `ClickUp search failed: ${query}`, { error: err.message });
          sources.push(this.createPlaceholderSource('clickup_search', query, 0.3));
        }
      }
    }

    if (researchPlan.search_queries?.slack) {
      searchSystemsUsed.push('slack');
      for (const query of researchPlan.search_queries.slack) {
        try {
          const slack = this.connectors.slack;
          if (slack) {
            const messages = await slack.searchMessages(query, 10);
            for (const msg of messages.slice(0, 5)) {
              sources.push({
                source_id: uuidv4(),
                type: 'slack_message',
                id: msg.ts || msg.iid,
                title: `Slack: ${query}`,
                content_uri: msg.permalink || null,
                content: (msg.text || '').substring(0, 3000),
                relevance_score: 0.7,
                query,
              });
            }
          } else {
            sources.push(this.createPlaceholderSource('slack_search', query, 0.7));
          }
        } catch (err) {
          logger.warn('researcher', `Slack search failed: ${query}`, { error: err.message });
          sources.push(this.createPlaceholderSource('slack_search', query, 0.3));
        }
      }
    }

    if (researchPlan.search_queries?.gmail) {
      searchSystemsUsed.push('gmail');
      for (const query of researchPlan.search_queries.gmail) {
        try {
          const gmail = this.connectors.gmail;
          if (gmail) {
            const messages = await gmail.searchMessages(query, 10);
            for (const msg of messages.slice(0, 5)) {
              const headers = msg.payload?.headers || [];
              const subject = headers.find(h => h.name === 'Subject')?.value || query;
              sources.push({
                source_id: uuidv4(),
                type: 'gmail_message',
                id: msg.id,
                title: subject,
                content_uri: null,
                content: (msg.snippet || '').substring(0, 3000),
                relevance_score: 0.6,
                query,
              });
            }
          } else {
            sources.push(this.createPlaceholderSource('gmail_search', query, 0.6));
          }
        } catch (err) {
          logger.warn('researcher', `Gmail search failed: ${query}`, { error: err.message });
          sources.push(this.createPlaceholderSource('gmail_search', query, 0.3));
        }
      }
    }

    if (researchPlan.search_queries?.drive) {
      searchSystemsUsed.push('drive');
      for (const query of researchPlan.search_queries.drive) {
        try {
          const drive = this.connectors.drive;
          if (drive) {
            const files = await drive.searchFiles(`name contains '${query}' or fullText contains '${query}'`, 5);
            for (const file of files) {
              sources.push({
                source_id: uuidv4(),
                type: 'drive_file',
                id: file.id,
                title: file.name,
                content_uri: file.webViewLink || null,
                content: `[Drive file: ${file.name} (${file.mimeType})]`,
                relevance_score: 0.7,
                query,
              });
            }
          } else {
            sources.push(this.createPlaceholderSource('drive_search', query, 0.7));
          }
        } catch (err) {
          logger.warn('researcher', `Drive search failed: ${query}`, { error: err.message });
          sources.push(this.createPlaceholderSource('drive_search', query, 0.3));
        }
      }
    }

    if (researchPlan.search_queries?.web) {
      searchSystemsUsed.push('web');
      for (const query of researchPlan.search_queries.web) {
        try {
          const result = await this.browserRouter.execute(
            `Search the web for: ${query}. Extract the most relevant technical content.`,
            { taskType: 'natural_language' }
          );
          sources.push({
            source_id: uuidv4(),
            type: 'web_search',
            id: uuidv4(),
            title: `Web: ${query}`,
            content_uri: result.url || null,
            content: (result.content || '').substring(0, 5000) || `[Web search for: ${query}]`,
            relevance_score: 0.5,
            query,
            engine: result.engine,
          });
        } catch (err) {
          logger.warn('researcher', `Web search failed: ${query}`, { error: err.message });
          sources.push(this.createPlaceholderSource('web_search', query, 0));
        }
      }
    }

    const synthesis = await this.chat(`
I have gathered the following sources for this documentation task:

${sources.map((s, i) => `### Source ${i + 1} (${s.type})\nTitle: ${s.title}\nContent: ${s.content?.substring(0, 1000)}`).join('\n\n')}

Synthesize these findings. Identify:
1. Key facts and data points
2. Gaps in the research
3. Contradictions between sources
4. Overall sufficiency assessment (sufficient / needs_more / insufficient)

Provide a comprehensive research summary.
    `);

    const evidencePack = {
      job_id: this.job.job_id,
      sources,
      summary: synthesis,
      total_sources: sources.length,
      research_duration_ms: Date.now() - startTime,
      key_questions: researchPlan.key_questions || [],
      gaps: [],
      sufficiency: 'sufficient',
      metadata: {
        researcher_version: '1.0.0',
        search_systems_used: searchSystemsUsed,
        created_at: new Date().toISOString(),
      },
    };

    const uri = await this.saveToS3('evidence-pack.json', JSON.stringify(evidencePack, null, 2));

    logger.info('researcher', `Research complete for job ${this.job.job_id}`, {
      sourceCount: sources.length,
      durationMs: evidencePack.research_duration_ms,
    });

    return {
      evidencePack,
      outputUri: uri,
      tokensUsed: this.tokensUsed,
    };
  }

  createPlaceholderSource(type, query, score) {
    return {
      source_id: uuidv4(),
      type,
      id: uuidv4(),
      title: `${type}: ${query}`,
      content_uri: null,
      content: `[Connector not configured - placeholder for: ${query}]`,
      relevance_score: score,
      query,
    };
  }
}

module.exports = { ResearcherAgent };
