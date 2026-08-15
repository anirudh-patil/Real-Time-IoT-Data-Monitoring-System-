import { env } from './env.config.js';

export const corsOptions = {
  origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};

export const rateLimitOptions = {
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
};

export const helmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
};

export const socketOptions = {
  cors: corsOptions,
  pingTimeout: 30000,
  pingInterval: 25000,
};
