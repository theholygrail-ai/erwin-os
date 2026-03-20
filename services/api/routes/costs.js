const { Router } = require('express');
const { costTracker } = require('@erwin-os/shared/cost-tracker');
const { groqLimiter, novaActLimiter } = require('@erwin-os/shared/rate-limiter');

const router = Router();

router.get('/', async (req, res) => {
  res.json({
    costs: costTracker.getReport(),
    rateLimits: {
      groq: groqLimiter.getStats(),
      novaAct: novaActLimiter.getStats(),
    },
  });
});

module.exports = router;
