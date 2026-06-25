import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import * as controller from './deals.controller';
import { createDealSchema, listDealsQuerySchema, updateDealSchema } from './deals.validators';

export const dealRoutes = Router();

dealRoutes.use(requireAuth);
dealRoutes.get('/deals', validateQuery(listDealsQuerySchema), controller.listDeals);
dealRoutes.post('/deals', validateBody(createDealSchema), controller.createDeal);
dealRoutes.get('/deals/:dealId', controller.getDeal);
dealRoutes.patch('/deals/:dealId', validateBody(updateDealSchema), controller.updateDeal);
dealRoutes.delete('/deals/:dealId', controller.deleteDeal);
