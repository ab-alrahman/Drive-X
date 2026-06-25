import { Router } from 'express';
import { requireCustomerAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './customers.controller';
import { customerLoginSchema, customerRefreshSchema, customerRegisterSchema } from './customers.validators';

export const customerRoutes = Router();

customerRoutes.post('/auth/register', validateBody(customerRegisterSchema), controller.register);
customerRoutes.post('/auth/login', validateBody(customerLoginSchema), controller.login);
customerRoutes.post('/auth/refresh', validateBody(customerRefreshSchema), controller.refresh);
customerRoutes.post('/auth/logout', validateBody(customerRefreshSchema), controller.logout);
customerRoutes.get('/auth/me', requireCustomerAuth, controller.me);
