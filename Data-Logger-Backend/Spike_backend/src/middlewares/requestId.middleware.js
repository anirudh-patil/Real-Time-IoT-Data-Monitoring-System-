import { randomUUID } from 'crypto';

export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  req.requestId = incomingId || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
