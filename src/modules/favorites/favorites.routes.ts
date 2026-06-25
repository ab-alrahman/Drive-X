import { Router } from 'express';
import { requireCustomerAuth } from '../../middleware/auth.middleware';
import * as controller from './favorites.controller';

export const favoriteRoutes = Router();

favoriteRoutes.use(requireCustomerAuth);
favoriteRoutes.get('/me/favorites', controller.listFavorites);
favoriteRoutes.post('/me/favorites/:carId', controller.addFavorite);
favoriteRoutes.delete('/me/favorites/:carId', controller.removeFavorite);
