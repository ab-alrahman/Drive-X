import { Router } from 'express';
import { requireAuth, requireCustomerAuth } from '../../middleware/auth.middleware';
import { publicLeadRateLimit } from '../../middleware/rate-limit.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import * as controller from './leads.controller';
import { createLeadSchema, listLeadsQuerySchema, updateLeadSchema } from './leads.validators';

export const publicLeadRoutes = Router();
export const adminLeadRoutes = Router();

publicLeadRoutes.post('/leads', publicLeadRateLimit, validateBody(createLeadSchema), controller.createLead);
publicLeadRoutes.get('/me/leads', requireCustomerAuth, validateQuery(listLeadsQuerySchema), controller.getMyLeads);

adminLeadRoutes.use(requireAuth);
adminLeadRoutes.get('/leads', validateQuery(listLeadsQuerySchema), controller.listLeads);
adminLeadRoutes.get('/leads/:leadId', controller.getLead);
adminLeadRoutes.patch('/leads/:leadId', validateBody(updateLeadSchema), controller.updateLead);

