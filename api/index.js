/**
 * Vercel Serverless Function — mounts the Express API at /api/*
 * Local dev: use `npm run dev` (Express on API_PORT, Vite proxies /api).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const serverless = require('serverless-http');
const app = require('../services/api/app');

module.exports = serverless(app);
