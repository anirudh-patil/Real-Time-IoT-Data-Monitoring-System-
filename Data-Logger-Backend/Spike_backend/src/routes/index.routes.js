import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import deviceRoutes from './device.routes.js';
import telemetryRoutes from './telemetry.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import alertRoutes from './alert.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/alerts', alertRoutes);

// Future module routers mount here, e.g.:
// import notificationRoutes from './notification.routes.js';
// router.use('/devices', deviceRoutes);
//
// import telemetryRoutes from './telemetry.routes.js';
// router.use('/telemetry', telemetryRoutes);
//
// import dashboardRoutes from './dashboard.routes.js';
// router.use('/dashboard', dashboardRoutes);
//
// import alertRoutes from './alert.routes.js';
// router.use('/alerts', alertRoutes);

export default router;
