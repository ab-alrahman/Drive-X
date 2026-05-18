import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as controller from './dashboard.controller';

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/dashboard/summary', controller.summary);

