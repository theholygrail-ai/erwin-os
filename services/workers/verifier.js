const { BaseAgent } = require('./base-agent');
const { AGENT_NAMES } = require('@erwin-os/schemas');
const { logger } = require('@erwin-os/shared/logger');

class VerifierAgent extends BaseAgent {
  constructor(params) {
    super(params, AGENT_NAMES.VERIFIER);
  }

  async execute() {
    logger.info('verifier', `Verifying document for job ${this.job.job_id}`);

    const draft = this.context.draftArtifact;
    const plan = this.context.documentPlan;
    const evidencePack = this.context.evidencePack;

    if (!draft?.content) {
      throw new Error('No draft document to verify');
    }

    const verification = await this.chatJson(`
You are verifying a technical document for submission readiness.

## Document Plan
${JSON.stringify(plan, null, 2)}

## Draft Document
${draft.content.substring(0, 15000)}

## Evidence Summary
${evidencePack?.summary || 'No evidence summary available'}

## Source Count: ${evidencePack?.total_sources || 0}

Perform a thorough verification. Check each criterion and score it.

Respond as JSON:
{
  "checks": {
    "structure_complete": {
      "passed": true,
      "score": 95,
      "notes": "explanation"
    },
    "all_sections_present": {
      "passed": true,
      "score": 90,
      "notes": "explanation"
    },
    "citations_valid": {
      "passed": true,
      "score": 80,
      "notes": "explanation"
    },
    "no_fabricated_claims": {
      "passed": true,
      "score": 85,
      "notes": "explanation"
    },
    "terminology_consistent": {
      "passed": true,
      "score": 90,
      "notes": "explanation"
    },
    "audience_appropriate": {
      "passed": true,
      "score": 85,
      "notes": "explanation"
    },
    "formatting_correct": {
      "passed": true,
      "score": 90,
      "notes": "explanation"
    },
    "front_matter_complete": {
      "passed": true,
      "score": 95,
      "notes": "explanation"
    }
  },
  "overall_confidence": 87,
  "passed": true,
  "summary": "overall assessment",
  "repair_notes": "specific items to fix if failed, or null if passed",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"]
}
    `, { maxTokens: 4096, temperature: 0.2 });

    const linkResults = await this.checkDocumentLinks(draft.content);
    verification.checks.links_working = {
      passed: linkResults.brokenCount === 0,
      score: linkResults.totalLinks > 0
        ? Math.round(((linkResults.totalLinks - linkResults.brokenCount) / linkResults.totalLinks) * 100)
        : 100,
      notes: linkResults.brokenCount > 0
        ? `${linkResults.brokenCount} broken links found: ${linkResults.broken.join(', ')}`
        : 'All links valid',
    };

    const scores = Object.values(verification.checks).map(c => c.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    verification.overall_confidence = avgScore;
    verification.passed = avgScore >= 70 && Object.values(verification.checks).every(c => c.passed !== false || c.score >= 50);

    const uri = await this.saveToS3('verification-result.json', JSON.stringify(verification, null, 2));

    logger.info('verifier', `Verification complete for job ${this.job.job_id}`, {
      passed: verification.passed,
      confidence: verification.overall_confidence,
    });

    return {
      verificationResult: {
        ...verification,
        repairNotes: verification.repair_notes,
      },
      outputUri: uri,
      tokensUsed: this.tokensUsed,
    };
  }

  async checkDocumentLinks(content) {
    const urlRegex = /https?:\/\/[^\s\)>\]]+/g;
    const urls = [...new Set(content.match(urlRegex) || [])];

    const results = { totalLinks: urls.length, brokenCount: 0, broken: [], checked: [] };

    for (const url of urls.slice(0, 20)) {
      const result = await this.browserRouter.checkLink(url);
      results.checked.push(result);
      if (!result.ok) {
        results.brokenCount++;
        results.broken.push(url);
      }
    }

    return results;
  }
}

module.exports = { VerifierAgent };
