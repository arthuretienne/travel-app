// backend/server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import travelRoutes from './src/routes/travel.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration: allow multiple origins via env var ALLOWED_ORIGINS (comma-separated)
// Example: ALLOWED_ORIGINS="http://localhost:5173,https://my-frontend.vercel.app"
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];

app.use(cors({
  origin: function(origin, callback) {
    // allow non-browser requests like curl/postman (no origin)
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

app.listen(PORT, () => {
const serverUrl = process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`;
console.log(`🚀 Server running on ${serverUrl}`);
console.log(`📡 API endpoints available at ${serverUrl}/api`);

});