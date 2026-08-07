import { Router } from 'express';
import { requireCustomerAuth } from '../../middleware/auth.middleware';
import * as controller from './favorites.controller';

export const favoriteRoutes = Router();

// requireCustomerAuth is applied per-route (not via a bare router-wide .use()) because this
// router is mounted at /public alongside sibling routers for other modules - a path-less
// .use() here would run for every request that falls through to this router, rejecting
// requests meant for routes registered on a LATER-mounted /public router (see the inspections
// module's public routes, which exposed exactly this bug).
favoriteRoutes.get('/me/favorites', requireCustomerAuth, controller.listFavorites);
favoriteRoutes.post('/me/favorites/:carId', requireCustomerAuth, controller.addFavorite);
favoriteRoutes.delete('/me/favorites/:carId', requireCustomerAuth, controller.removeFavorite);
