// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// Global Rate Limiter: 100 requests per IP every 15 minutes
// This is a sensible default for general-purpose routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, 
  legacyHeaders: false, 
  message: (req, res) => {
    // Custom error message for employees/admins
    return res.status(429).json({
      message: 'Too many requests, please try again after 15 minutes.',
      status: 429
    });
  },
});