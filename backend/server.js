// backend/server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import travelRoutes from './src/routes/travel.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf('*') !== -1) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/travel', travelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Travel AI API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// ⭐ ADD '0.0.0.0' HERE - This is critical for Railway
app.listen(PORT, '0.0.0.0', () => {
  const serverUrl = process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`;
  console.log(`🚀 Server running on ${serverUrl}`);
  console.log(`📡 API endpoints available at ${serverUrl}/api`);
  console.log(`Checking Claude API Key: ${process.env.CLAUDE_API_KEY ? 'API key is set' : 'API key is missing'}`);
  console.log(`Amadeus credentials: {`);
  console.log(`  clientId: '${process.env.AMADEUS_CLIENT_ID || ''}',`);
  console.log(`  clientSecret: '${process.env.AMADEUS_CLIENT_SECRET ? '[REDACTED]' : ''}'`);
  console.log(`}`);
});