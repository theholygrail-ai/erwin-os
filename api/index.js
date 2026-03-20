module.exports = async (req, res) => {
  const t0 = Date.now();
  const times = {};

  try {
    times.serverlessHttp = Date.now();
    const serverless = require('serverless-http');
    times.serverlessHttp = Date.now() - times.serverlessHttp;

    times.app = Date.now();
    const app = require('../services/api/app');
    times.app = Date.now() - times.app;

    times.handler = Date.now();
    const handler = serverless(app);
    times.handler = Date.now() - times.handler;

    times.total = Date.now() - t0;

    if (req.url === '/api/_cold' || req.url === '/_cold') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ coldStart: times }));
    }

    return handler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message, stack: err.stack, times, elapsed: Date.now() - t0 }));
  }
};
