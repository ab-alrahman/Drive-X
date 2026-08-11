import { z } from 'zod';

export const maintenanceRequestTypeSchema = z.enum([
  'ROUTINE_SERVICE',
  'REPAIR',
  'DIAGNOSTIC',
  'BODY_PAINT',
  'TIRES_BRAKES',
  'EMERGENCY',
  'OTHER'
]);

export const maintenanceStatusSchema = z.enum([
  'NEW',
  'ADMIN_REVIEW',
  'TRIAGED',
  'SENT_TO_VENDOR',
  'VENDOR_ACKNOWLEDGED',
  'ASSIGNED_TO_PARTNER',
  'SCHEDULED',
  'IN_PROGRESS',
  'WAITING_CUSTOMER_APPROVAL',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
]);

export const createMaintenanceRequestSchema = z.object({
  carId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  requestType: maintenanceRequestTypeSchema,
  city: z.string().min(1).max(80),
  preferredTime: z.string().datetime().optional(),
  pickupNeeded: z.boolean().default(false),
  notes: z.string().min(1).max(3000),
  contactPhone: z.string().min(3).max(30)
});

export const triageMaintenanceSchema = z.object({
  status: z.enum(['TRIAGED', 'REJECTED', 'SENT_TO_VENDOR']),
  note: z.string().max(2000).optional()
});

export const assignMaintenanceSchema = z.object({
  partnerId: z.string().uuid(),
  note: z.string().max(2000).optional()
});

export const scheduleMaintenanceSchema = z.object({
  scheduledAt: z.string().datetime(),
  note: z.string().max(2000).optional()
});

export const updateMaintenanceStatusSchema = z.object({
  status: maintenanceStatusSchema,
  note: z.string().max(2000).optional(),
  publicSummary: z.string().max(2000).optional(),
  quotedAmount: z.number().nonnegative().optional(),
  quotedCurrency: z.enum(['USD', 'SYP']).optional()
});

export const maintenanceUpdateSchema = z.object({
  note: z.string().min(1).max(2000),
  isPublic: z.boolean().default(false)
});
