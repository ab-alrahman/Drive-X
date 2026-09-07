import { Router } from 'express';
import { requireAuth, requireCustomerAuth, requireRole } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import * as controller from './chat.controller';
import { createThreadSchema, sendMessageSchema } from './chat.validators';

export const publicChatRoutes = Router();

// requireCustomerAuth is applied per-route (not via a bare router-wide .use()) because
// every publicXxxRoutes router is mounted on the same '/public' prefix - a router-wide
// guard here would reject anonymous traffic to sibling public endpoints too.
publicChatRoutes.get('/chat/threads', requireCustomerAuth, controller.listMyThreads);
publicChatRoutes.post(
  '/chat/threads',
  requireCustomerAuth,
  validateBody(createThreadSchema),
  controller.createThread
);
publicChatRoutes.get(
  '/chat/threads/:threadId/messages',
  requireCustomerAuth,
  controller.getMyThreadMessages
);
publicChatRoutes.post(
  '/chat/threads/:threadId/messages',
  requireCustomerAuth,
  validateBody(sendMessageSchema),
  controller.postMyMessage
);

export const adminChatRoutes = Router();

adminChatRoutes.use(requireAuth);
// GET is shared: Platform Admin sees every thread (read-only oversight), a vendor
// operator sees only their own. Replying is vendor-only.
adminChatRoutes.get('/chat/threads', controller.listAdminThreads);
adminChatRoutes.get('/chat/threads/:threadId/messages', controller.getAdminThreadMessages);
adminChatRoutes.post(
  '/chat/threads/:threadId/messages',
  requireRole('OWNER', 'STAFF'),
  validateBody(sendMessageSchema),
  controller.postAdminMessage
);
