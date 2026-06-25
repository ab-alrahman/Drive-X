import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { adminCarRoutes, publicCarRoutes } from './modules/cars/cars.routes';
import { customerRoutes } from './modules/customers/customers.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { dealRoutes } from './modules/deals/deals.routes';
import { favoriteRoutes } from './modules/favorites/favorites.routes';
import { adminLeadRoutes, publicLeadRoutes } from './modules/leads/leads.routes';

export const router = Router();

router.use('/public', publicCarRoutes);
router.use('/public', publicLeadRoutes);
router.use('/public', customerRoutes);
router.use('/public', favoriteRoutes);

router.use('/admin/auth', authRoutes);
router.use('/admin', adminCarRoutes);
router.use('/admin', adminLeadRoutes);
router.use('/admin', dealRoutes);
router.use('/admin', dashboardRoutes);
