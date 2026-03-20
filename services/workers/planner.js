const { BaseAgent } = require('./base-agent');
const { AGENT_NAMES } = require('@erwin-os/schemas');
const { logger } = require('@erwin-os/shared/logger');

class PlannerAgent extends BaseAgent {
  constructor(params) {
    super(params, AGENT_NAMES.PLANNER);
  }

  async execute() {
    logger.info('planner', `Creating document plan for job ${this.job.job_id}`);

    const evidenceSummary = this.context.evidencePack?.summary || 'No evidence provided';
    const sourceCount = this.context.evidencePack?.total_sources || 0;

    const plan = await this.chatJson(`
${this.buildJobContext()}

## Evidence Summary
${evidenceSummary}

Total sources gathered: ${sourceCount}

${this.context.verificationResult ? `## Previous Verification Feedback\n${JSON.stringify(this.context.verificationResult.repairNotes)}` : ''}

Create a detailed documentation plan. Respond as JSON:
{
  "document_type": "the specific doc type",
  "title": "proposed document title",
  "audience": {
    "primary": "who this is for",
    "technical_level": "executive | manager | developer | mixed",
    "context": "what they need this document for"
  },
  "structure": {
    "sections": [
      {
        "number": "1",
        "title": "Section Title",
        "description": "What this section covers",
        "estimated_length": "short | medium | long",
        "required_evidence": ["source types needed"],
        "is_required": true
      }
    ]
  },
  "front_matter": {
    "author": "Erwin Mothoa",
    "version": "1.0",
    "status": "Draft",
    "classification": "Internal",
    "additional_fields": {}
  },
  "missing_inputs": ["anything still needed"],
  "acceptance_checklist": [
    "criterion 1",
    "criterion 2",
    "criterion 3",
    "criterion 4",
    "criterion 5"
  ],
  "estimated_effort": "low | medium | high",
  "notes": "any additional planning notes"
}
    `, { maxTokens: 4096 });

    const uri = await this.saveToS3('document-plan.json', JSON.stringify(plan, null, 2));

    logger.info('planner', `Plan created for job ${this.job.job_id}`, {
      docType: plan.document_type,
      sections: plan.structure?.sections?.length || 0,
    });

    return {
      documentPlan: plan,
      outputUri: uri,
      tokensUsed: this.tokensUsed,
    };
  }
}

module.exports = { PlannerAgent };
