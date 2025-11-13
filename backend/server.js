// backend/server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import travelRoutes from './src/routes/travel.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : ['http://localhost:5173'];

console.log('🌐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins);
console.log('   ALLOWED_ORIGINS env:', process.env.ALLOWED_ORIGINS);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }
    
    // Allow all origins if '*' is specified
    if (allowedOrigins.indexOf('*') !== -1) {
      console.log(`✅ Allowing request from ${origin} (wildcard enabled)`);
      return callback(null, true);
    }
    
    // Check if origin is in allowed list (exact match)
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ Allowing CORS request from: ${origin}`);
      return callback(null, true);
    }
    
    // Also check if origin matches any pattern (for Vercel preview deployments)
    const originMatches = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });
    
    if (originMatches) {
      console.log(`✅ Allowing CORS request from: ${origin} (pattern match)`);
      return callback(null, true);
    }
    
    console.warn(`❌ Blocked CORS request from origin: ${origin}`);
    console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    console.warn(`   Please add ${origin} to ALLOWED_ORIGINS in Railway`);
    return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Root route for Railway health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Travel AI API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      travel: '/api/travel/recommendations'
    }
  });
});

// Routes
app.use('/api/travel', travelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Travel AI API is running', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit, let the server continue running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, let the server continue running
});

console.log('🔍 Server Configuration:');
console.log('   Port:', PORT);
console.log('   Host: 0.0.0.0');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   RAILWAY_STATIC_URL:', process.env.RAILWAY_STATIC_URL);
console.log('   RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);

// ⭐ CRITICAL: Bind to 0.0.0.0 for Railway
const server = app.listen(PORT, '0.0.0.0', () => {
  const serverUrl = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;
  console.log(`🚀 Server running on ${serverUrl}`);
  console.log(`📡 API endpoints available at ${serverUrl}/api`);
  console.log(`✅ Health check available at ${serverUrl}/api/health`);
  console.log(`✅ Root endpoint available at ${serverUrl}/`);
});

// Graceful shutdown handling for Railway
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));