import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uploadProfileImage } from '../middlewares/upload.middleware.js';
import { ROLES } from '../constants/roles.js';
import {
  updateProfileValidator,
  listUsersValidator,
  userIdParamValidator,
  adminUpdateUserValidator,
} from '../validators/user.validator.js';

const router = Router();

router.use(authenticate); // every route below requires a valid access token

/**
 * @openapi
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get your own profile
 *     responses:
 *       200: { description: Profile }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   patch:
 *     tags: [Users]
 *     summary: Update your own profile (name only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [name], properties: { name: { type: string } } }
 *     responses:
 *       200: { description: Profile updated }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/profile', userController.getProfile);
router.patch('/profile', updateProfileValidator, userController.updateProfile);

/**
 * @openapi
 * /users/profile/image:
 *   post:
 *     tags: [Users]
 *     summary: Upload/replace your profile image (JPEG/PNG/WEBP, max 5MB)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { image: { type: string, format: binary } } }
 *     responses:
 *       200: { description: Profile image updated }
 *       422: { description: Invalid file type or too large }
 */
router.post('/profile/image', uploadProfileImage, userController.uploadProfileImage);

/**
 * @openapi
 * /users/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Deactivate your own account (revokes all sessions)
 *     responses:
 *       200: { description: Account deactivated }
 */
router.post('/deactivate', userController.deactivateOwnAccount);

/**
 * @openapi
 * /users/account:
 *   delete:
 *     tags: [Users]
 *     summary: Permanently delete your own account
 *     responses:
 *       200: { description: Account deleted }
 */
router.delete('/account', userController.deleteOwnAccount);

/**
 * @openapi
 * /users/activity:
 *   get:
 *     tags: [Users]
 *     summary: Get your own activity history
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Activity history }
 */
router.get('/activity', userController.getOwnActivity);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Admin only - list all users
 *     parameters:
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CursorParam'
 *     responses:
 *       200: { description: Paginated user list }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authorize(ROLES.ADMIN), listUsersValidator, userController.listUsers);

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Admin only - get a user by id
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     tags: [Users]
 *     summary: Admin only - update a user's name, role, or active status
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               role: { type: string, enum: [admin, engineer, viewer] }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: User updated }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   delete:
 *     tags: [Users]
 *     summary: Admin only - delete a user
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/:userId', authorize(ROLES.ADMIN), userIdParamValidator, userController.getUserById);
router.patch('/:userId', authorize(ROLES.ADMIN), adminUpdateUserValidator, userController.adminUpdateUser);
router.delete('/:userId', authorize(ROLES.ADMIN), userIdParamValidator, userController.adminDeleteUser);

/**
 * @openapi
 * /users/{userId}/activity:
 *   get:
 *     tags: [Users]
 *     summary: Admin only - get another user's activity history
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activity history }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/:userId/activity', authorize(ROLES.ADMIN), userIdParamValidator, userController.getUserActivity);

export default router;
