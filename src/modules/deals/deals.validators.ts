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
  commissionType: z.enum(['PERCENTAGE', 'FIXED']),
  commissionValue: z.number().nonnegative(),
  notes: z.string().optional()
});
