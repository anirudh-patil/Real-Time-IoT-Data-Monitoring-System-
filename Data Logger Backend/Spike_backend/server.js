import http from 'http';
import app from './app.js';
import { env } from './src/config/env.config.js';
import { initSocket } from './src/websocket/socket.js';
import { startMqttSubscriber, stopMqttSubscriber } from './src/services/mqttSubscriber.service.js';
import { startAlertScheduler, stopAlertScheduler } from './src/services/alertScheduler.service.js';
import { appLogger, errorLogger } from './src/config/logger.config.js';

const server = http.createServer(app);

initSocket(server);
startMqttSubscriber();
startAlertScheduler();

server.listen(env.port, () => {
  appLogger.info('IoT Energy Monitoring backend running', {
    environment: env.nodeEnv,
    port: env.port,
    apiBase: `http://localhost:${env.port}/api/${env.apiVersion}`,
  });
});

function shutdown(signal) {
  appLogger.info(`Received ${signal}, shutting down gracefully...`);
  stopMqttSubscriber();
  stopAlertScheduler();
  server.close(() => {
    appLogger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force-exit if shutdown hangs
  setTimeout(() => {
    errorLogger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  errorLogger.error('Unhandled Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  errorLogger.error('Uncaught Exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

export default server;
