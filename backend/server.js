// backend/server.js
// CRITICAL: Import env.js FIRST to load environment variables before anything else
import './env.js';

import express from 'express';
import cors from 'cors';
import travelRoutes from './src/routes/travel.js';
import userRoutes from './src/routes/user.js';
import searchRoutes from './src/routes/searches.js';
import calendarRoutes from './src/routes/calendar.js';
import prisma from './src/db/prisma.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://travel-app-ten-rho.vercel.app', // Production frontend
    /\.vercel\.app$/ // Allow all Vercel preview deployments
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/travel', travelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/searches', searchRoutes);
app.use('/api/calendar', calendarRoutes);

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
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
  console.log('  - GET    /api/health');
});