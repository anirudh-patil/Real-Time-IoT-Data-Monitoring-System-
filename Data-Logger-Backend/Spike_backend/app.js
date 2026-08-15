import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './src/config/env.config.js';
import { corsOptions, rateLimitOptions, helmetOptions } from './src/config/server.config.js';
import { requestIdMiddleware } from './src/middlewares/requestId.middleware.js';
import { requestLoggerMiddleware } from './src/middlewares/requestLogger.middleware.js';
import { notFoundMiddleware } from './src/middlewares/notFound.middleware.js';
import { errorHandlerMiddleware } from './src/middlewares/errorHandler.middleware.js';
import { getHealth } from './src/controllers/health.controller.js';
import { swaggerSpec } from './src/config/swagger.config.js';
import apiRouter from './src/routes/index.routes.js';

const app = express();

// --- Security & parsing middleware ---
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(rateLimit(rateLimitOptions));

// --- Health check (basic liveness for now) ---
app.get('/health', getHealth);

// --- API documentation ---
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'IoT Energy Monitoring Platform API' }));

// --- Versioned API routes ---
app.use(`/api/${env.apiVersion}`, apiRouter);

// --- 404 + centralized error handling ---
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
