// backend/server.js
// CRITICAL: Import env.js FIRST to load environment variables before anything else
import './env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { createServer } from 'http';
import travelRoutes from './src/routes/travel.js';
import userRoutes from './src/routes/user.js';
import searchRoutes from './src/routes/searches.js';
import calendarRoutes from './src/routes/calendar.js';
import datesRoutes from './src/routes/dates.js';
import tripsRoutes from './src/routes/trips.js';
import invitationsRoutes from './src/routes/invitations.js';
import votingRoutes from './src/routes/voting.js';
import messagesRoutes from './src/routes/messages.js';
import membersRoutes from './src/routes/members.js';
import billingRoutes from './src/routes/billing.js';
import priceAlertsRoutes from './src/routes/priceAlerts.js';
import tripEnhancementsRoutes from './src/routes/tripEnhancements.js';
import friendsRoutes from './src/routes/friends.js';
import pushRoutes from './src/routes/push.js';
import expensesRoutes from './src/routes/expenses.js';
import opportunitiesRoutes from './src/routes/opportunities.js';
import prisma from './src/db/prisma.js';
import { apiLimiter, strictLimiter, emailLimiter } from './src/middleware/rateLimiter.js';
import { initializeSocketServer } from './src/services/socketService.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server for real-time chat
initializeSocketServer(httpServer);

// Trust proxy - Render sits behind a single reverse proxy. Trusting exactly one
// hop lets express read the real client IP from X-Forwarded-For WITHOUT letting a
// client spoof it by injecting their own XFF (which `true` would have allowed,
// neutralising every IP-based rate limiter).
app.set('trust proxy', 1);

// Security headers. We disable contentSecurityPolicy (this is a JSON API, not
// a page server) and crossOriginResourcePolicy (CORS is configured separately
// below). Everything else stays at helmet's defaults: HSTS, X-Frame-Options
// DENY, X-Content-Type-Options nosniff, Referrer-Policy, etc.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://travel-app-ten-rho.vercel.app', // Legacy Vercel frontend
    'https://skusku.life',                    // Production domain
    'https://www.skusku.life',                // Production domain with www
    /\.vercel\.app$/,                         // Allow all Vercel preview deployments
    /\.skusku\.life$/                         // Allow subdomains
  ],
  credentials: true
}));
// Body parsing. The Stripe webhook AND the Clerk webhook must receive the raw,
// unparsed body so their signatures can be verified byte-for-byte. We therefore
// skip the global JSON parser for those two paths — each route mounts its own
// `express.raw()` and parses after verifying the signature. Everything else
// gets parsed JSON as before.
const RAW_BODY_PATHS = new Set(['/api/billing/webhook', '/api/users/sync']);
app.use((req, res, next) => {
  if (RAW_BODY_PATHS.has(req.path)) return next();
  return express.json()(req, res, next);
});

// Rate limiting
app.use('/api/', apiLimiter); // Apply general rate limit to all API routes

// Constant-time comparison for the cron shared-secret header. Falls back to
// `false` on length mismatch (timingSafeEqual throws if buffers differ in
// length, which would itself leak length info via a thrown exception).
function isValidCronSecret(provided) {
  const expected = process.env.CRON_SECRET;
  if (!expected || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Routes
app.use('/api/travel', travelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/searches', searchRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dates', datesRoutes);

// Billing & subscription routes
app.use('/api/billing', billingRoutes);

// Price alerts
app.use('/api/price-alerts', priceAlertsRoutes);

// Push notifications
app.use('/api/push', pushRoutes);

// Collaborative trips routes
app.use('/api/trips', tripsRoutes);
app.use('/api/trips', votingRoutes);
app.use('/api/trips', messagesRoutes);
app.use('/api/trips', membersRoutes);
app.use('/api/trips', invitationsRoutes);
app.use('/api/invitations', invitationsRoutes);

// Friends system
app.use('/api/friends', friendsRoutes);
app.use('/api/trips', tripEnhancementsRoutes);
app.use('/api/trips', expensesRoutes);

// Proactive opportunities (Sprint 4)
app.use('/api/opportunities', opportunitiesRoutes);

// DEV-ONLY persona impersonation routes (local testing). Never mounted in prod.
if (process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true') {
  const { default: devRoutes } = await import('./src/routes/dev.js');
  app.use('/api/dev', devRoutes);
  console.log('🧪 DEV routes mounted at /api/dev (impersonation enabled)');
}

// Cron endpoint for automated price checks (called by Render Cron Job)
app.post('/api/cron/check-prices', async (req, res) => {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (!isValidCronSecret(cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { checkAllAlerts } = await import('./src/services/priceAlertService.js');
    const results = await checkAllAlerts();
    res.json({ success: true, results });
  } catch (error) {
    console.error('[Cron] Price check error:', error.message);
    res.status(500).json({ success: false, error: 'Price check failed' });
  }
});

// Cron: send weekly digest email to all users (Monday 8am)
app.post('/api/cron/weekly-digest', async (req, res) => {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (!isValidCronSecret(cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { sendWeeklyDigestToAll } = await import('./src/services/digestService.js');
    const results = await sendWeeklyDigestToAll();
    res.json({ success: true, results });
  } catch (error) {
    console.error('[Cron] Weekly digest error:', error.message);
    res.status(500).json({ success: false, error: 'Digest failed' });
  }
});

// Cron: scan all users for proactive travel opportunities (daily)
app.post('/api/cron/scan-opportunities', async (req, res) => {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (!isValidCronSecret(cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { scanAllUsers } = await import('./src/services/opportunityService.js');
    const results = await scanAllUsers();
    res.json({ success: true, results });
  } catch (error) {
    console.error('[Cron] Opportunity scan error:', error.message);
    res.status(500).json({ success: false, error: 'Scan failed' });
  }
});

// Public health check. Intentionally minimal: anything beyond liveness leaks
// information about the deployment (which integrations are configured, which
// mode the server is in, etc.) and is high-signal for attackers. For
// operational diagnostics, use the protected /api/health/internal endpoint
// below or check server logs.
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

// Detailed health endpoint — gated behind the same shared secret as cron jobs
// so it can be hit by uptime monitors / on-call but not by the public web.
app.get('/api/health/internal', async (req, res) => {
  const provided = req.headers['x-cron-secret'] || req.query.secret;
  if (!isValidCronSecret(provided)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      environment: {
        clerkSecretKey: !!process.env.CLERK_SECRET_KEY,
        anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
        bookingApiKey: !!process.env.BOOKING_API_KEY,
        databaseUrl: !!process.env.DATABASE_URL,
        resendApiKey: !!process.env.RESEND_API_KEY,
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        stripePriceExplorer: !!process.env.STRIPE_PRICE_ID_EXPLORER,
        stripePriceWanderer: !!process.env.STRIPE_PRICE_ID_WANDERER,
        stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        vapidPublicKey: !!process.env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
        upstashRedis: !!process.env.UPSTASH_REDIS_REST_URL,
        betaModeActive: process.env.BETA_MODE === 'true' || process.env.STRIPE_DISABLED === 'true',
        googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Error handling — never leak stack traces or internal details
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server ready for real-time chat`);
  console.log(`✅ Database connected (Neon PostgreSQL)`);
  console.log(`✅ Cache service ready (${process.env.UPSTASH_REDIS_REST_URL ? 'Upstash Redis' : 'In-memory'})`);
  console.log(`✅ Authentication ready (Clerk)`);
  console.log('');
  console.log('Available routes:');
  console.log('  - POST   /api/travel/recommendations');
  console.log('  - POST   /api/users/sync');
  console.log('  - GET    /api/users/me');
  console.log('  - PUT    /api/users/preferences');
  console.log('  - POST   /api/searches');
  console.log('  - GET    /api/searches/history');
  console.log('  - GET    /api/searches/:id');
  console.log('  - POST   /api/searches/trips/save');
  console.log('  - GET    /api/searches/trips/saved');
  console.log('  - PUT    /api/searches/trips/:id');
  console.log('  - DELETE /api/searches/trips/:id');
  console.log('  - GET    /api/calendar/oauth/authorize');
  console.log('  - GET    /api/calendar/oauth/callback');
  console.log('  - GET    /api/calendar/status');
  console.log('  - POST   /api/calendar/disconnect');
  console.log('  - GET    /api/calendar/suggestions');
  console.log('  - GET    /api/dates/intelligent');
  console.log('');
  console.log('Collaborative Trips:');
  console.log('  - GET    /api/trips');
  console.log('  - POST   /api/trips');
  console.log('  - GET    /api/trips/:id');
  console.log('  - PATCH  /api/trips/:id');
  console.log('  - DELETE /api/trips/:id');
  console.log('  - POST   /api/trips/from-saved/:savedTripId');
  console.log('  - POST   /api/trips/:tripId/invitations');
  console.log('  - POST   /api/invitations/:token/accept');
  console.log('  - POST   /api/invitations/:token/decline');
  console.log('  - POST   /api/trips/:tripId/destinations');
  console.log('  - POST   /api/trips/:tripId/vote');
  console.log('  - GET    /api/trips/:tripId/voting-results');
  console.log('  - POST   /api/trips/:tripId/finalize-vote');
  console.log('  - GET    /api/trips/:tripId/messages');
  console.log('  - POST   /api/trips/:tripId/messages');
  console.log('');
  console.log('  - GET    /api/health');
});