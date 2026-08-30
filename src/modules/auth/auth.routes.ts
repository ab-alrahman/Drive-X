import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { adminLoginRateLimit } from '../../middleware/rate-limit.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  updateProfileSchema
} from './auth.validators';

export const authRoutes = Router();

authRoutes.post('/login', adminLoginRateLimit, validateBody(loginSchema), controller.login);
authRoutes.post('/refresh', validateBody(refreshTokenSchema), controller.refresh);
authRoutes.post('/logout', validateBody(refreshTokenSchema), controller.logout);
authRoutes.get('/me', requireAuth, controller.me);
authRoutes.patch('/me', requireAuth, validateBody(updateProfileSchema), controller.updateProfile);
authRoutes.post('/forgot-password', adminLoginRateLimit, validateBody(forgotPasswordSchema), controller.forgotPassword);
authRoutes.post('/reset-password', validateBody(resetPasswordSchema), controller.resetPassword);
