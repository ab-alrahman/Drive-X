import { z } from 'zod';
import { personNameSchema } from '../../shared/validators';

export const registerVendorSchema = z.object({
  vendorName: z.string().min(2).max(160),
  ownerFullName: personNameSchema,
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(100)
});

export const suspendVendorSchema = z.object({
  reason: z.string().min(1).max(2000)
});

export const hideCarSchema = z.object({
  reason: z.string().min(1).max(2000)
});
