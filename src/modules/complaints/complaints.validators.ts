import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination';

export const submitComplaintSchema = z.object({
  description: z.string().min(10).max(2000)
});

export const listComplaintsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['OPEN', 'SUBSTANTIATED', 'DISMISSED', 'RESOLVED']).optional(),
  vendorId: z.string().uuid().optional()
});

export const reviewComplaintSchema = z.object({
  decision: z.enum(['SUBSTANTIATED', 'DISMISSED', 'RESOLVED']),
  note: z.string().max(2000).optional()
});
