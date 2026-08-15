import { requestLogger } from '../config/logger.config.js';

export function requestLoggerMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    requestLogger.info('HTTP request', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}
