const { logger } = require('@erwin-os/shared/logger');
const { config } = require('@erwin-os/shared/config');

const NOVA_ACT_COST_PER_HOUR = 4.75;

class BrowserRouter {
  constructor(mcpHost) {
    this.mcpHost = mcpHost;
    this.dailySpend = 0;
    this.dailyResetDate = new Date().toDateString();
    this.sessionStartTimes = new Map();
    this.stats = {
      novaActCalls: 0,
      playwrightCalls: 0,
      novaActFailovers: 0,
    };
    this._playwrightBrowser = null;
  }

  resetDailyBudgetIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this.dailyResetDate) {
      this.dailySpend = 0;
      this.dailyResetDate = today;
      this.stats = { novaActCalls: 0, playwrightCalls: 0, novaActFailovers: 0 };
      logger.info('browser-router', 'Daily budget reset');
    }
  }

  isNovaActHealthy() {
    const status = this.mcpHost.getStatus();
    const novaAct = status.nova_act_browser;
    return novaAct && novaAct.status === 'running';
  }

  isWithinBudget() {
    this.resetDailyBudgetIfNeeded();
    return this.dailySpend < config.novaAct.dailyBudget;
  }

  shouldUseNovaAct(taskType = 'natural_language') {
    if (taskType === 'deterministic') return false;
    if (!config.novaAct.apiKey) return false;
    if (!this.isNovaActHealthy()) return false;
    if (!this.isWithinBudget()) {
      logger.warn('browser-router', 'Nova Act daily budget exceeded, using Playwright', {
        dailySpend: this.dailySpend,
        budget: config.novaAct.dailyBudget,
      });
      return false;
    }
    return true;
  }

  async execute(instruction, options = {}) {
    const { taskType = 'natural_language', timeout = 60000 } = options;

    if (this.shouldUseNovaAct(taskType)) {
      try {
        const result = await this.executeWithNovaAct(instruction, timeout);
        this.stats.novaActCalls++;
        return { engine: 'nova_act', ...result };
      } catch (err) {
        logger.warn('browser-router', 'Nova Act failed, falling back to Playwright', {
          error: err.message,
        });
        this.stats.novaActFailovers++;
      }
    }

    const result = await this.executeWithPlaywright(instruction, options);
    this.stats.playwrightCalls++;
    return { engine: 'playwright', ...result };
  }

  async executeWithNovaAct(instruction, timeout) {
    const sessionResult = await this.mcpHost.callTool('nova_act_browser', 'start_session', {});
    const sessionId = sessionResult?.session_id;

    if (!sessionId) throw new Error('Failed to start Nova Act session');
    this.sessionStartTimes.set(sessionId, Date.now());

    try {
      const result = await this.mcpHost.callTool('nova_act_browser', 'execute_instruction', {
        session_id: sessionId,
        instruction,
      });

      const screenshot = await this.mcpHost.callTool('nova_act_browser', 'inspect_browser', {
        session_id: sessionId,
      });

      return {
        content: result?.content || result,
        screenshot: screenshot?.screenshot_path || null,
        sessionId,
      };
    } finally {
      const startTime = this.sessionStartTimes.get(sessionId);
      if (startTime) {
        const hours = (Date.now() - startTime) / (1000 * 60 * 60);
        this.dailySpend += hours * NOVA_ACT_COST_PER_HOUR;
        this.sessionStartTimes.delete(sessionId);
      }

      try {
        await this.mcpHost.callTool('nova_act_browser', 'end_session', { session_id: sessionId });
      } catch {
        logger.warn('browser-router', 'Failed to end Nova Act session', { sessionId });
      }
    }
  }

  async executeWithPlaywright(instruction, options = {}) {
    const { chromium } = require('playwright');

    if (!this._playwrightBrowser) {
      this._playwrightBrowser = await chromium.launch({ headless: true });
    }

    const context = await this._playwrightBrowser.newContext();
    const page = await context.newPage();

    try {
      if (options.url) {
        await page.goto(options.url, { waitUntil: 'networkidle', timeout: 30000 });
      }

      let content = '';
      if (options.selector) {
        content = await page.textContent(options.selector);
      } else if (options.url) {
        content = await page.textContent('body');
      }

      const screenshotBuffer = await page.screenshot({ fullPage: false });

      return {
        content: content || '',
        screenshot: screenshotBuffer ? screenshotBuffer.toString('base64').substring(0, 200) + '...' : null,
        url: page.url(),
      };
    } finally {
      await context.close();
    }
  }

  async navigateAndExtract(url, options = {}) {
    if (this.shouldUseNovaAct('natural_language')) {
      try {
        return await this.execute(`Navigate to ${url} and extract the main content`, {
          taskType: 'natural_language',
          ...options,
        });
      } catch {
        // Fall through to Playwright
      }
    }

    return this.execute(null, { ...options, url, taskType: 'deterministic' });
  }

  async checkLink(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      return { url, status: response.status, ok: response.ok, engine: 'fetch' };
    } catch (err) {
      return { url, status: 0, ok: false, error: err.message, engine: 'fetch' };
    }
  }

  getStats() {
    this.resetDailyBudgetIfNeeded();
    return {
      ...this.stats,
      dailySpend: Math.round(this.dailySpend * 100) / 100,
      dailyBudget: config.novaAct.dailyBudget,
      budgetRemaining: Math.round((config.novaAct.dailyBudget - this.dailySpend) * 100) / 100,
      novaActHealthy: this.isNovaActHealthy(),
      activeSessions: this.sessionStartTimes.size,
    };
  }

  async shutdown() {
    if (this._playwrightBrowser) {
      await this._playwrightBrowser.close();
      this._playwrightBrowser = null;
    }
  }
}

module.exports = { BrowserRouter };
