require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { verifyFirebaseToken, tryVerifyFirebaseToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', ts: new Date() }));

// ── Service URLs ──────────────────────────────────────────────────────────────
const JOB_POSTING_URL  = process.env.JOB_POSTING_URL  || 'http://localhost:3001';
const JOB_SEARCH_URL   = process.env.JOB_SEARCH_URL   || 'http://localhost:3002';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://localhost:3003';
const AI_AGENT_URL     = process.env.AI_AGENT_URL     || 'http://localhost:3004';

const proxyOpts = (target) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    error: (err, req, res) => {
      logger.error(`Proxy error → ${target}: ${err.message}`);
      res.status(502).json({ success: false, message: 'Service temporarily unavailable.' });
    },
  },
});

// ── Protected Routes (require Firebase token) ─────────────────────────────────
const protectedJobRoutes = [
  { method: 'POST', path: '/api/v1/jobs' },
  { method: 'PUT',  path: '/api/v1/jobs' },
  { method: 'POST', path: '/api/v1/apply' },
];

const authGuard = (req, res, next) => {
  const isProtected = protectedJobRoutes.some(r =>
    req.method === r.method && req.path.startsWith(r.path)
  );
  if (isProtected) return verifyFirebaseToken(req, res, next);
  return next();
};

// ── Proxy Routes ──────────────────────────────────────────────────────────────

// Job Posting Service  →  POST/PUT /api/v1/jobs, GET /api/v1/jobs/:id, POST /api/v1/apply
app.use('/api/v1/jobs',  authGuard, createProxyMiddleware(proxyOpts(JOB_POSTING_URL)));
app.use('/api/v1/apply', authGuard, createProxyMiddleware(proxyOpts(JOB_POSTING_URL)));

// Job Search Service   →  GET /api/v1/search, GET /api/v1/autocomplete, GET /api/v1/history
app.use('/api/v1/search',       tryVerifyFirebaseToken, createProxyMiddleware(proxyOpts(JOB_SEARCH_URL)));
app.use('/api/v1/autocomplete', createProxyMiddleware(proxyOpts(JOB_SEARCH_URL)));
app.use('/api/v1/history',      verifyFirebaseToken, createProxyMiddleware(proxyOpts(JOB_SEARCH_URL)));

// Notification Service →  POST /api/v1/notifications
app.use('/api/v1/notifications', verifyFirebaseToken, createProxyMiddleware(proxyOpts(NOTIFICATION_URL)));

// AI Agent Service     →  POST /api/v1/ai
app.use('/api/v1/ai', createProxyMiddleware(proxyOpts(AI_AGENT_URL)));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => logger.info(`API Gateway listening on port ${PORT}`));

module.exports = app;
