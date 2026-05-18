import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './auth.controller';
import { loginSchema, refreshTokenSchema } from './auth.validators';

export const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), controller.login);
authRoutes.post('/refresh', validateBody(refreshTokenSchema), controller.refresh);
authRoutes.post('/logout', validateBody(refreshTokenSchema), controller.logout);
authRoutes.get('/me', requireAuth, controller.me);

