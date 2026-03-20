const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const app = require('./app');

if (!process.env.VERCEL) {
  app.listen(config.server.port, config.server.host, () => {
    logger.info('api', `Server listening on ${config.server.host}:${config.server.port}`);
  });
}

module.exports = app;
