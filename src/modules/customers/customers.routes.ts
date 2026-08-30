import { Router } from 'express';
import { requireCustomerAuth } from '../../middleware/auth.middleware';
import { customerAuthRateLimit } from '../../middleware/rate-limit.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './customers.controller';
import {
  customerLoginSchema,
  customerRefreshSchema,
  customerRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema
} from './customers.validators';

export const customerRoutes = Router();

customerRoutes.post('/auth/register', customerAuthRateLimit, validateBody(customerRegisterSchema), controller.register);
customerRoutes.post('/auth/login', customerAuthRateLimit, validateBody(customerLoginSchema), controller.login);
customerRoutes.post('/auth/refresh', customerAuthRateLimit, validateBody(customerRefreshSchema), controller.refresh);
customerRoutes.post('/auth/logout', validateBody(customerRefreshSchema), controller.logout);
customerRoutes.get('/auth/me', requireCustomerAuth, controller.me);
customerRoutes.patch('/me', requireCustomerAuth, validateBody(updateProfileSchema), controller.updateProfile);
customerRoutes.post('/auth/forgot-password', customerAuthRateLimit, validateBody(forgotPasswordSchema), controller.forgotPassword);
customerRoutes.post('/auth/reset-password', validateBody(resetPasswordSchema), controller.resetPassword);
