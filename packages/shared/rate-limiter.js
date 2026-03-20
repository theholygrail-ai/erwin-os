const { logger } = require('./logger');

class RateLimiter {
  constructor({ name, maxRequests, windowMs, burstLimit }) {
    this.name = name;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.burstLimit = burstLimit || maxRequests;
    this.timestamps = [];
    this.waitQueue = [];
  }

  prune() {
    const cutoff = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter(t => t > cutoff);
  }

  async acquire() {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.prune();
        if (this.timestamps.length < this.maxRequests) {
          this.timestamps.push(Date.now());
          resolve();
        } else {
          const waitMs = this.timestamps[0] + this.windowMs - Date.now() + 50;
          logger.debug('rate-limiter', `${this.name}: throttled, waiting ${waitMs}ms`, {
            current: this.timestamps.length,
            max: this.maxRequests,
          });
          setTimeout(tryAcquire, Math.max(waitMs, 100));
        }
      };
      tryAcquire();
    });
  }

  getStats() {
    this.prune();
    return {
      name: this.name,
      current: this.timestamps.length,
      max: this.maxRequests,
      windowMs: this.windowMs,
      utilization: Math.round((this.timestamps.length / this.maxRequests) * 100),
    };
  }
}

const groqLimiter = new RateLimiter({
  name: 'groq',
  maxRequests: 28,
  windowMs: 60_000,
});

const novaActLimiter = new RateLimiter({
  name: 'nova_act',
  maxRequests: 10,
  windowMs: 60_000,
});

module.exports = { RateLimiter, groqLimiter, novaActLimiter };
