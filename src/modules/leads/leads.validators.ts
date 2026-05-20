import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination';

const today = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const phoneSchema = z
  .string()
  .min(6)
  .max(30)
  .regex(/^\+?[0-9][0-9\s-]{5,29}$/, 'phone must contain digits and may include +, spaces, or dashes');

export const createLeadSchema = z
  .object({
    carId: z.string().uuid(),
    intent: z.enum(['BUY', 'RENT']),
    fullName: z.string().min(2).max(120),
    phone: phoneSchema,
    email: z.string().email().optional(),
    city: z.string().min(1).max(80),
    message: z.string().max(2000).optional(),
    rentalStartDate: z.string().date().optional(),
    rentalEndDate: z.string().date().optional(),
    requestDelivery: z.boolean().default(false),
    deliveryAddress: z.string().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.intent === 'RENT' && (!value.rentalStartDate || !value.rentalEndDate)) {
      ctx.addIssue({
        code: 'custom',
        path: ['rentalStartDate'],
        message: 'rentalStartDate and rentalEndDate are required for rent requests'
      });
    }
    if (value.rentalStartDate && new Date(value.rentalStartDate) < today()) {
      ctx.addIssue({
        code: 'custom',
        path: ['rentalStartDate'],
        message: 'rentalStartDate cannot be in the past'
      });
    }
    if (value.rentalStartDate && value.rentalEndDate && value.rentalEndDate < value.rentalStartDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['rentalEndDate'],
        message: 'rentalEndDate must be on or after rentalStartDate'
      });
    }
    if (value.requestDelivery && !value.deliveryAddress) {
      ctx.addIssue({
        code: 'custom',
        path: ['deliveryAddress'],
        message: 'deliveryAddress is required when requestDelivery is true'
      });
    }
  });

export const listLeadsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['NEW', 'CONTACTED', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'CLOSED']).optional(),
  intent: z.enum(['BUY', 'RENT']).optional(),
  sortBy: z.enum(['newest', 'oldest']).default('newest')
});

export const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'CLOSED']).optional(),
  adminNotes: z.string().max(2000).optional()
});
