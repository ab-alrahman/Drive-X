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
adminCarRoutes.get('/cars', validateQuery(listCarsQuerySchema), controller.listAdminCars);
adminCarRoutes.post('/cars', validateBody(createCarSchema), controller.createCar);
adminCarRoutes.get('/cars/:carId', controller.getAdminCar);
adminCarRoutes.patch('/cars/:carId', validateBody(updateCarSchema), controller.updateCar);
adminCarRoutes.delete('/cars/:carId', requireRole('OWNER'), controller.deleteCar);
adminCarRoutes.post('/cars/:carId/images', uploadCarImage.single('file'), controller.uploadImage);
adminCarRoutes.delete('/cars/:carId/images/:imageId', controller.deleteImage);
