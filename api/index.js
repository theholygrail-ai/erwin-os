let handler;

module.exports = async (req, res) => {
  if (!handler) {
    try {
      require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
      const serverless = require('serverless-http');
      const app = require('../services/api/app');
      handler = serverless(app);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to init: ' + err.message, stack: err.stack });
    }
  }
  return handler(req, res);
};
