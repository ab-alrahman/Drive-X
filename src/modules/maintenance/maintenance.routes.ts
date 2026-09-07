import { Router } from 'express';
import { requireAuth, requireCustomerAuth } from '../../middleware/auth.middleware';
import { uploadInspectionFile } from '../../middleware/upload.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './maintenance.controller';
import {
  assignMaintenanceSchema,
  createMaintenanceRequestSchema,
  maintenanceUpdateSchema,
  scheduleMaintenanceSchema,
  triageMaintenanceSchema,
  updateMaintenanceStatusSchema
} from './maintenance.validators';

export const publicMaintenanceRoutes = Router();

publicMaintenanceRoutes.get('/cars/:carId/maintenance/history', controller.getPublicCarMaintenanceHistory);
publicMaintenanceRoutes.get('/maintenance/workshops', requireCustomerAuth, controller.listWorkshops);
publicMaintenanceRoutes.get('/me/cars', requireCustomerAuth, controller.getMyCars);
publicMaintenanceRoutes.get('/me/maintenance/requests', requireCustomerAuth, controller.listCustomerRequests);
publicMaintenanceRoutes.get('/maintenance/requests/:requestId', requireCustomerAuth, controller.getCustomerRequest);
publicMaintenanceRoutes.post(
  '/maintenance/requests',
  requireCustomerAuth,
  validateBody(createMaintenanceRequestSchema),
  controller.createCustomerRequest
);
publicMaintenanceRoutes.post(
  '/maintenance/requests/:requestId/files',
  requireCustomerAuth,
  uploadInspectionFile.single('file'),
  controller.uploadCustomerFile
);
publicMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/cancel',
  requireCustomerAuth,
  controller.cancelCustomerRequest
);
publicMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/approve-quote',
  requireCustomerAuth,
  controller.approveCustomerQuote
);
publicMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/reject-quote',
  requireCustomerAuth,
  controller.rejectCustomerQuote
);

export const adminMaintenanceRoutes = Router();

adminMaintenanceRoutes.use(requireAuth);
adminMaintenanceRoutes.get('/maintenance/requests', controller.listAdminRequests);
adminMaintenanceRoutes.get('/maintenance/requests/:requestId', controller.getAdminRequest);
adminMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/triage',
  validateBody(triageMaintenanceSchema),
  controller.triageRequest
);
adminMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/assign',
  validateBody(assignMaintenanceSchema),
  controller.assignPartner
);
adminMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/schedule',
  validateBody(scheduleMaintenanceSchema),
  controller.scheduleRequest
);
adminMaintenanceRoutes.patch(
  '/maintenance/requests/:requestId/status',
  validateBody(updateMaintenanceStatusSchema),
  controller.updateStatus
);
adminMaintenanceRoutes.post(
  '/maintenance/requests/:requestId/updates',
  validateBody(maintenanceUpdateSchema),
  controller.addAdminUpdate
);
