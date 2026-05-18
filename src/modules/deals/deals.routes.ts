import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import * as controller from './deals.controller';
import { createDealSchema, listDealsQuerySchema } from './deals.validators';

export const dealRoutes = Router();

dealRoutes.use(requireAuth);
dealRoutes.get('/deals', validateQuery(listDealsQuerySchema), controller.listDeals);
dealRoutes.post('/deals', validateBody(createDealSchema), controller.createDeal);

