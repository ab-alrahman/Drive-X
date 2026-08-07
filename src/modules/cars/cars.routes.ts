import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { uploadCarImage } from '../../middleware/upload.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import * as controller from './cars.controller';
import { createCarSchema, listCarsQuerySchema, updateCarSchema } from './cars.validators';

export const publicCarRoutes = Router();
export const adminCarRoutes = Router();

publicCarRoutes.get('/cars', validateQuery(listCarsQuerySchema), controller.listPublicCars);
publicCarRoutes.get('/cars/:carId', controller.getPublicCar);
publicCarRoutes.get('/meta/filters', controller.filtersMeta);

adminCarRoutes.use(requireAuth);
// GET routes are shared: Platform Admin sees every vendor (oversight), OWNER/STAFF see only
// their own vendor's cars (scoping happens in the controller/service, not here). Writes are
// vendor-operator business, not platform oversight - Platform Admin has no generic write path
// here at all (see the vendors module for its actual hide/suspend actions).
adminCarRoutes.get('/cars', validateQuery(listCarsQuerySchema), controller.listAdminCars);
adminCarRoutes.get('/cars/:carId', controller.getAdminCar);
adminCarRoutes.post('/cars', requireRole('OWNER', 'STAFF'), validateBody(createCarSchema), controller.createCar);
adminCarRoutes.patch('/cars/:carId', requireRole('OWNER', 'STAFF'), validateBody(updateCarSchema), controller.updateCar);
adminCarRoutes.delete('/cars/:carId', requireRole('OWNER'), controller.deleteCar);
adminCarRoutes.post(
  '/cars/:carId/images',
  requireRole('OWNER', 'STAFF'),
  uploadCarImage.single('file'),
  controller.uploadImage
);
adminCarRoutes.delete('/cars/:carId/images/:imageId', requireRole('OWNER', 'STAFF'), controller.deleteImage);
