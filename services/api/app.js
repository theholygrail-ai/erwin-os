require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');

const webhookRoutes = require('./routes/webhooks');
const jobRoutes = require('./routes/jobs');
const artifactRoutes = require('./routes/artifacts');
const standupRoutes = require('./routes/standup');
const connectorRoutes = require('./routes/connectors');
const agentRoutes = require('./routes/agents');
const runRoutes = require('./routes/runs');
const healthRoutes = require('./routes/health');
const auditRoutes = require('./routes/audit');
const costRoutes = require('./routes/costs');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const docsRoutes = require('./routes/docs');

const app = express();

// Vercel routes all /api/* to the serverless handler; Express sees /api/health — strip prefix.
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    const url = req.url || '';
    if (url === '/api' || url.startsWith('/api?') || url.startsWith('/api/')) {
      req.url = url.replace(/^\/api(\/|$)/, '/') || '/';
    }
    next();
  });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

app.use((req, res, next) => {
  logger.debug('api', `${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

app.use('/webhooks', webhookRoutes);
app.use('/jobs', jobRoutes);
app.use('/artifacts', artifactRoutes);
app.use('/standup', standupRoutes);
app.use('/connectors', connectorRoutes);
app.use('/agents', agentRoutes);
app.use('/runs', runRoutes);
app.use('/health', healthRoutes);
app.use('/audit', auditRoutes);
app.use('/costs', costRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notifications', notificationRoutes);
app.use('/docs', docsRoutes);

const sseClients = new Set();

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcastEvent(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
}

app.locals.broadcastEvent = broadcastEvent;

app.use((err, req, res, next) => {
  logger.error('api', 'Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
