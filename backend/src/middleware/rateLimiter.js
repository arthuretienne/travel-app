// backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 500 requests per 15 minutes per IP (increased for better UX)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Validate proxy configuration for Railway/Vercel
  validate: { trustProxy: false }, // Disable validation since we handle proxy in server.js
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

/**
 * Strict rate limiter for expensive operations
 * (Claude AI calls, Amadeus searches)
 * 10 requests per 15 minutes per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit for this operation. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Auth rate limiter
 * 5 requests per 15 minutes per IP
 * (Prevent brute force attacks)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  validate: { trustProxy: false },
});

/**
 * Email rate limiter
 * 3 emails per hour per IP
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 emails per hour
  message: {
    error: 'Too many emails sent',
    message: 'You have sent too many emails. Please try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Per-user rate limiter for expensive operations (recommendations)
 * Uses authenticated user ID as key, not IP.
 * 10 requests per 15 minutes per user account.
 * Must be placed AFTER authenticateUser middleware.
 */
export const userStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    // Use authenticated user ID if available, fall back to IP
    return req.user?.id || req.ip;
  },
});

/**
 * Per-user rate limiter for autocomplete/search (lighter)
 * 60 requests per minute per user — allows fast typing
 */
export const userSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Too many search requests',
    message: 'Please slow down. Try again in a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

export default {
  apiLimiter,
  strictLimiter,
  authLimiter,
  emailLimiter,
  userStrictLimiter,
  userSearchLimiter,
};
