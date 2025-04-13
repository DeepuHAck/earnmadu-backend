import rateLimit from 'express-rate-limit';
import { AppError } from '../types';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    throw new AppError('Too many requests from this IP, please try again later', 429);
  },
});

// Auth endpoints rate limiter (more strict)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after an hour',
  handler: (req, res) => {
    throw new AppError('Too many login attempts from this IP, please try again after an hour', 429);
  },
});

// Video view rate limiter
export const videoViewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // Limit each IP to 2 video view requests per minute
  message: 'Please wait before watching another video',
  handler: (req, res) => {
    throw new AppError('Please wait before watching another video', 429);
  },
});

// Withdrawal request rate limiter
export const withdrawalLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Limit each IP to 3 withdrawal requests per day
  message: 'Too many withdrawal requests, please try again tomorrow',
  handler: (req, res) => {
    throw new AppError('Too many withdrawal requests, please try again tomorrow', 429);
  },
}); 