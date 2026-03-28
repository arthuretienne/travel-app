// backend/server.js
// CRITICAL: Import env.js FIRST to load environment variables before anything else
import './env.js';

import express from 'express';
import cors from 'cors';
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

// Trust proxy - Required for Railway/Vercel deployments to properly handle X-Forwarded-For headers
app.set('trust proxy', true);

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
app.use(express.json());

// Rate limiting
app.use('/api/', apiLimiter); // Apply general rate limit to all API routes

// Stripe webhook needs raw body - must be before express.json() middleware
// So we need to handle it specially in the billing routes

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

// Cron endpoint for automated price checks (called by Render Cron Job)
app.post('/api/cron/check-prices', async (req, res) => {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
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

// Cron: scan all users for proactive travel opportunities (daily)
app.post('/api/cron/scan-opportunities', async (req, res) => {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      message: 'Travel AI API is running',
      database: 'connected',
      environment: {
        clerkSecretKey: process.env.CLERK_SECRET_KEY ? '✅ SET' : '❌ MISSING',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY ? '✅ SET' : '❌ MISSING',
        bookingApiKey: process.env.BOOKING_API_KEY ? '✅ SET' : '❌ MISSING',
        databaseUrl: process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING',
        resendApiKey: process.env.RESEND_API_KEY ? '✅ SET' : '❌ MISSING',
        stripeSecretKey: process.env.STRIPE_SECRET_KEY ? '✅ SET' : '❌ MISSING',
        stripePriceExplorer: process.env.STRIPE_PRICE_ID_EXPLORER ? '✅ SET' : '❌ MISSING',
        stripePriceWanderer: process.env.STRIPE_PRICE_ID_WANDERER ? '✅ SET' : '❌ MISSING',
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '✅ SET' : '❌ MISSING',
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY ? '✅ SET' : '❌ MISSING',
        vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? '✅ SET' : '❌ MISSING',
        upstashRedis: process.env.UPSTASH_REDIS_REST_URL ? '✅ SET' : '⚠️ NOT SET (using in-memory)',
        betaMode: process.env.BETA_MODE === 'false' ? '🔴 LIMITS ACTIVE' : '🟡 BETA (no limits)',
        googleClientId: process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ MISSING',
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      database: 'disconnected',
      error: error.message
    });
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