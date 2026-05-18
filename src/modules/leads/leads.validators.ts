import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination';

export const createLeadSchema = z
  .object({
    carId: z.string().uuid(),
    intent: z.enum(['BUY', 'RENT']),
    fullName: z.string().min(2).max(120),
    phone: z.string().min(6).max(30),
    email: z.string().email().optional(),
    city: z.string().optional(),
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
  intent: z.enum(['BUY', 'RENT']).optional()
});

export const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'CLOSED']).optional(),
  adminNotes: z.string().max(2000).optional()
});

