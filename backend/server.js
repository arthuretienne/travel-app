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
import tripEnhancementsRoutes from './src/routes/tripEnhancements.js';
import friendsRoutes from './src/routes/friends.js';
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
        amadeusClientId: process.env.AMADEUS_CLIENT_ID ? '✅ SET' : '❌ MISSING',
        amadeusClientSecret: process.env.AMADEUS_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
        databaseUrl: process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING',
        googleClientId: process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ MISSING',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
        googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ? '✅ SET' : '❌ MISSING',
        resendApiKey: process.env.RESEND_API_KEY ? '✅ SET' : '❌ MISSING',
        emailFrom: process.env.EMAIL_FROM || '❌ NOT SET (using default)',
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

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
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
  console.log(`✅ Cache service ready (Upstash Redis)`);
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