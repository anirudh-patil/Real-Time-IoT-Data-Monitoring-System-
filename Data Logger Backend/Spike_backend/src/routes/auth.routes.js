import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { ROLES } from '../constants/roles.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new account (always assigned the viewer role)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties: { data: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Email already registered }
 */
router.post('/register', registerValidator, authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in, returns an access + refresh token pair
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid credentials }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/login', loginValidator, authController.login);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate a refresh token for a new access + refresh pair
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties: { refreshToken: { type: string } }
 *     responses:
 *       200: { description: New token pair issued }
 *       401: { description: Refresh token invalid, expired, or already used }
 */
router.post('/refresh-token', refreshTokenValidator, authController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh token (idempotent)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties: { refreshToken: { type: string } }
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', refreshTokenValidator, authController.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email (never reveals whether the email exists)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties: { email: { type: string, format: email } }
 *     responses:
 *       200: { description: Reset email sent if the account exists }
 */
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the token emailed by /forgot-password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Password reset, all sessions revoked }
 *       401: { description: Reset link invalid or expired }
 */
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties: { data: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change your own password (all sessions revoked afterward)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Current password incorrect, or not authenticated }
 */
router.post('/change-password', authenticate, changePasswordValidator, authController.changePassword);

/**
 * @openapi
 * /auth/register/admin:
 *   post:
 *     tags: [Auth]
 *     summary: Admin-only - register a user with an explicit role (Admin/Engineer/Viewer)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *               role: { type: string, enum: [admin, engineer, viewer] }
 *     responses:
 *       201: { description: Account created }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  '/register/admin',
  authenticate,
  authorize(ROLES.ADMIN),
  registerValidator,
  authController.register
);

export default router;
