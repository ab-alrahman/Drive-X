import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './vendors.controller';
import { hideCarSchema, registerVendorSchema, suspendVendorSchema } from './vendors.validators';

// Self-serve vendor onboarding - no manual approval gate (see the multi-tenancy decision).
export const publicVendorRoutes = Router();
publicVendorRoutes.post('/vendors/register', validateBody(registerVendorSchema), controller.registerVendor);

// Platform Admin oversight only - standard tiered model (full read/visibility, fast
// suspend/hide, no generic write access to any vendor's data, every action logged).
// requireAuth/requireRole are applied per-route (not via a bare router-wide .use()) - this
// router is mounted at /admin alongside sibling routers, and a path-less .use() would run for
// every request that falls through to it, same bug class fixed in favorites.routes.ts.
export const platformVendorRoutes = Router();
const platformOnly = [requireAuth, requireRole('PLATFORM_ADMIN')];
platformVendorRoutes.get('/vendors', ...platformOnly, controller.listVendors);
platformVendorRoutes.patch('/vendors/:vendorId/suspend', ...platformOnly, validateBody(suspendVendorSchema), controller.suspendVendor);
platformVendorRoutes.patch('/vendors/:vendorId/unsuspend', ...platformOnly, controller.unsuspendVendor);
platformVendorRoutes.patch('/cars/:carId/hide', ...platformOnly, validateBody(hideCarSchema), controller.hideCar);
platformVendorRoutes.patch('/cars/:carId/unhide', ...platformOnly, controller.unhideCar);
