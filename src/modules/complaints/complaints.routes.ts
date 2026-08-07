import { Router } from 'express';
import { requireAuth, requireCustomerAuth, requireRole } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import * as controller from './complaints.controller';
import { listComplaintsQuerySchema, reviewComplaintSchema, submitComplaintSchema } from './complaints.validators';

export const publicComplaintRoutes = Router();
publicComplaintRoutes.post(
  '/cars/:carId/complaints',
  requireCustomerAuth,
  validateBody(submitComplaintSchema),
  controller.submitComplaint
);

export const platformComplaintRoutes = Router();
const platformOnly = [requireAuth, requireRole('PLATFORM_ADMIN')];
platformComplaintRoutes.get('/complaints', ...platformOnly, validateQuery(listComplaintsQuerySchema), controller.listComplaints);
platformComplaintRoutes.post(
  '/complaints/:complaintId/review',
  ...platformOnly,
  validateBody(reviewComplaintSchema),
  controller.reviewComplaint
);
