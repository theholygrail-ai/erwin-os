const { Router } = require('express');
const { getAuditLogs } = require('@erwin-os/shared/audit-log');
const { logger } = require('@erwin-os/shared/logger');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit, actor, action, resource, start_date, end_date } = req.query;

    const logs = await getAuditLogs({
      limit: parseInt(limit || '100'),
      actor,
      action,
      resource,
      startDate: start_date,
      endDate: end_date,
    });

    res.json({ logs, total: logs.length });
  } catch (err) {
    logger.error('api-audit', 'Failed to get audit logs', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
