import { Server } from 'socket.io';
import { socketOptions } from '../config/server.config.js';
import { verifyAccessToken } from '../utils/token.util.js';
import { getDevice } from '../services/device.service.js';
import { ROLES } from '../constants/roles.js';

let io = null;

/**
 * Rooms:
 *   user:{userId}     - joined by every connection; personal channel
 *   role:managers      - joined by Admin/Engineer; sees every device's updates
 *   device:{deviceId}  - joined on demand via 'subscribe:device', after an
 *                        ownership check identical to the REST API's rule
 *
 * A telemetry/alert broadcast targets all three so it reaches: the device's
 * owner, anyone actively viewing that device's page, and every manager -
 * without the emitter needing to know who's currently connected.
 */

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication token is required'));
  }

  try {
    const payload = verifyAccessToken(token);
    socket.user = { userId: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    return next(new Error(err.message || 'Invalid authentication token'));
  }
}

function registerConnectionHandlers(socket) {
  socket.join(`user:${socket.user.userId}`);
  if ([ROLES.ADMIN, ROLES.ENGINEER].includes(socket.user.role)) {
    socket.join('role:managers');
  }

  socket.on('subscribe:device', async (deviceId, ack) => {
    try {
      await getDevice(deviceId, socket.user); // throws 403/404 if not accessible
      socket.join(`device:${deviceId}`);
      if (typeof ack === 'function') ack({ success: true });
    } catch (err) {
      if (typeof ack === 'function') {
        ack({ success: false, message: err.message || 'Unable to subscribe to this device' });
      }
    }
  });

  socket.on('unsubscribe:device', (deviceId) => {
    socket.leave(`device:${deviceId}`);
  });
}

export function initSocket(httpServer) {
  io = new Server(httpServer, socketOptions);
  io.use(authenticateSocket);
  io.on('connection', registerConnectionHandlers);
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized - call initSocket(server) first');
  }
  return io;
}

/**
 * Called by the MQTT subscriber (real-time) and the Alert Engine when it
 * generates a new alert. Safe to call even if no one is listening on
 * these rooms - Socket.IO just no-ops.
 */
export function broadcastDeviceTelemetry(deviceId, ownerId, reading) {
  if (!io) return;
  io.to(`device:${deviceId}`).to(`user:${ownerId}`).to('role:managers').emit('telemetry:update', { deviceId, reading });
}

export function broadcastAlert(deviceId, ownerId, alert) {
  if (!io) return;
  io.to(`device:${deviceId}`).to(`user:${ownerId}`).to('role:managers').emit('alert:new', { deviceId, alert });
}
