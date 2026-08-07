import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination';

const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(['USD', 'SYP'])
});

export const listDealsQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(['newest', 'oldest']).default('newest')
});

export const createDealSchema = z.object({
  leadId: z.string().uuid(),
  carId: z.string().uuid(),
  type: z.enum(['SALE', 'RENT']),
  finalPrice: moneySchema,
  // Deprecated: commission is now the flat platform-wide rate (item 25). Kept optional for
  // backward-compatible clients; the service always overrides them with the central rate.
  commissionType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  commissionValue: z.number().nonnegative().optional(),
  notes: z.string().optional()
});

export const updateDealSchema = createDealSchema.partial();
