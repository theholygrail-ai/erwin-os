const { logger } = require('./logger');

class CostTracker {
  constructor() {
    this.dailyResetDate = new Date().toDateString();
    this.groq = { inputTokens: 0, outputTokens: 0, requests: 0 };
    this.novaAct = { agentHours: 0, sessions: 0 };
    this.playwright = { sessions: 0 };
  }

  resetIfNewDay() {
    const today = new Date().toDateString();
    if (today !== this.dailyResetDate) {
      this.groq = { inputTokens: 0, outputTokens: 0, requests: 0 };
      this.novaAct = { agentHours: 0, sessions: 0 };
      this.playwright = { sessions: 0 };
      this.dailyResetDate = today;
    }
  }

  trackGroqUsage(usage) {
    this.resetIfNewDay();
    this.groq.inputTokens += usage.prompt_tokens || 0;
    this.groq.outputTokens += usage.completion_tokens || 0;
    this.groq.requests++;
  }

  trackNovaActSession(durationMs) {
    this.resetIfNewDay();
    this.novaAct.agentHours += durationMs / (1000 * 60 * 60);
    this.novaAct.sessions++;
  }

  trackPlaywrightSession() {
    this.resetIfNewDay();
    this.playwright.sessions++;
  }

  getReport() {
    this.resetIfNewDay();

    const groqInputCost = (this.groq.inputTokens / 1_000_000) * 0.15;
    const groqOutputCost = (this.groq.outputTokens / 1_000_000) * 0.60;
    const novaActCost = this.novaAct.agentHours * 4.75;

    return {
      date: this.dailyResetDate,
      groq: {
        ...this.groq,
        estimatedCost: Math.round((groqInputCost + groqOutputCost) * 1000) / 1000,
      },
      novaAct: {
        ...this.novaAct,
        agentHours: Math.round(this.novaAct.agentHours * 1000) / 1000,
        estimatedCost: Math.round(novaActCost * 100) / 100,
      },
      playwright: this.playwright,
      totalEstimatedCost: Math.round((groqInputCost + groqOutputCost + novaActCost) * 100) / 100,
    };
  }
}

const costTracker = new CostTracker();

module.exports = { CostTracker, costTracker };
