let handler;

module.exports = async (req, res) => {
  if (!handler) {
    try {
      const serverless = require('serverless-http');
      const app = require('../services/api/app');
      handler = serverless(app);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: err.message, stack: err.stack }));
    }
  }
  return handler(req, res);
};
