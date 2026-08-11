import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { adminCarRoutes, publicCarRoutes } from './modules/cars/cars.routes';
import { platformComplaintRoutes, publicComplaintRoutes } from './modules/complaints/complaints.routes';
import { customerRoutes } from './modules/customers/customers.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { dealRoutes } from './modules/deals/deals.routes';
import { favoriteRoutes } from './modules/favorites/favorites.routes';
import { inspectionRoutes, publicInspectionRoutes } from './modules/inspections/inspections.routes';
import { adminLeadRoutes, publicLeadRoutes } from './modules/leads/leads.routes';
import { adminMaintenanceRoutes, publicMaintenanceRoutes } from './modules/maintenance/maintenance.routes';
import { platformVendorRoutes, publicVendorRoutes } from './modules/vendors/vendors.routes';

export const router = Router();

router.use('/public', publicCarRoutes);
router.use('/public', publicLeadRoutes);
router.use('/public', customerRoutes);
router.use('/public', favoriteRoutes);
router.use('/public', publicInspectionRoutes);
router.use('/public', publicMaintenanceRoutes);
router.use('/public', publicVendorRoutes);
router.use('/public', publicComplaintRoutes);

router.use('/admin/auth', authRoutes);
router.use('/admin', adminCarRoutes);
router.use('/admin', adminLeadRoutes);
router.use('/admin', dealRoutes);
router.use('/admin', dashboardRoutes);
router.use('/admin', inspectionRoutes);
router.use('/admin', adminMaintenanceRoutes);
router.use('/admin', platformVendorRoutes);
router.use('/admin', platformComplaintRoutes);
