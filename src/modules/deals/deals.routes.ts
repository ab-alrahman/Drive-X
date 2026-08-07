import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import * as controller from './deals.controller';
import { createDealSchema, listDealsQuerySchema, updateDealSchema } from './deals.validators';

export const dealRoutes = Router();

dealRoutes.use(requireAuth);
dealRoutes.get('/deals', validateQuery(listDealsQuerySchema), controller.listDeals);
dealRoutes.get('/deals/:dealId', controller.getDeal);
dealRoutes.post('/deals', requireRole('OWNER', 'STAFF'), validateBody(createDealSchema), controller.createDeal);
dealRoutes.patch(
  '/deals/:dealId',
  requireRole('OWNER', 'STAFF'),
  validateBody(updateDealSchema),
  controller.updateDeal
);
dealRoutes.delete('/deals/:dealId', requireRole('OWNER', 'STAFF'), controller.deleteDeal);
