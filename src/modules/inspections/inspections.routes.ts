import { Router } from 'express';
import { requireAuth, requireCustomerAuth, requireRole } from '../../middleware/auth.middleware';
import { uploadInspectionFile } from '../../middleware/upload.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './inspections.controller';
import {
  createTechnicianSchema,
  customerRequestInspectionSchema,
  flagRoundSchema,
  requestTechnicianVisitSchema,
  scheduleRoundSchema,
  submitReportSchema,
  submitSellerInspectionSchema,
  updateTechnicianSchema
} from './inspections.validators';

export const inspectionRoutes = Router();

inspectionRoutes.use(requireAuth);

inspectionRoutes.get('/cars/:carId/inspection', controller.getCaseForCar);
inspectionRoutes.post(
  '/cars/:carId/inspection/rounds',
  validateBody(submitSellerInspectionSchema),
  controller.submitSellerInspection
);
inspectionRoutes.post(
  '/cars/:carId/inspection/rounds/request-technician',
  validateBody(requestTechnicianVisitSchema),
  controller.requestTechnicianVisit
);
inspectionRoutes.post(
  '/cars/:carId/inspection/upload',
  uploadInspectionFile.single('file'),
  controller.uploadInspectionFile
);

inspectionRoutes.patch('/inspections/rounds/:roundId/schedule', validateBody(scheduleRoundSchema), controller.scheduleRound);
inspectionRoutes.patch('/inspections/rounds/:roundId/start', controller.startRound);
inspectionRoutes.patch('/inspections/rounds/:roundId/report', validateBody(submitReportSchema), controller.submitReport);
inspectionRoutes.patch('/inspections/rounds/:roundId/certify', controller.certifyRound);
inspectionRoutes.patch('/inspections/rounds/:roundId/cancel', controller.cancelRound);
inspectionRoutes.patch(
  '/inspections/rounds/:roundId/flag-fraudulent',
  requireRole('PLATFORM_ADMIN'),
  validateBody(flagRoundSchema),
  controller.flagRoundAsFraudulent
);

inspectionRoutes.get('/technicians', controller.listTechnicians);
inspectionRoutes.post('/technicians', validateBody(createTechnicianSchema), controller.createTechnician);
inspectionRoutes.patch('/technicians/:technicianId', validateBody(updateTechnicianSchema), controller.updateTechnician);

// Public/customer-facing: viewing a car's inspection history needs no auth (it's part of the
// public listing's trust signal); requesting a fresh technician visit needs a logged-in customer.
export const publicInspectionRoutes = Router();

publicInspectionRoutes.get('/cars/:carId/inspection', controller.getPublicCaseForCar);
publicInspectionRoutes.post(
  '/cars/:carId/inspection/request-technician',
  requireCustomerAuth,
  validateBody(customerRequestInspectionSchema),
  controller.requestTechnicianVisitAsCustomer
);
