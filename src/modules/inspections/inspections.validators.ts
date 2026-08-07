import { z } from 'zod';

export const submitSellerInspectionSchema = z
  .object({
    sourceType: z.enum(['EXTERNAL_FILE', 'TEMPLATE']),
    externalFileUrl: z.string().url().optional(),
    templateData: z.record(z.string(), z.unknown()).optional()
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === 'EXTERNAL_FILE' && !value.externalFileUrl) {
      ctx.addIssue({ code: 'custom', path: ['externalFileUrl'], message: 'externalFileUrl is required for EXTERNAL_FILE' });
    }
    if (value.sourceType === 'TEMPLATE' && !value.templateData) {
      ctx.addIssue({ code: 'custom', path: ['templateData'], message: 'templateData is required for TEMPLATE' });
    }
  });

export const requestTechnicianVisitSchema = z.object({
  requestedByRole: z.enum(['SELLER', 'BUYER', 'RENTER']),
  notes: z.string().max(2000).optional()
});

export const customerRequestInspectionSchema = z.object({
  intent: z.enum(['BUY', 'RENT']),
  notes: z.string().max(2000).optional()
});

export const flagRoundSchema = z.object({
  reason: z.string().min(1).max(2000)
});

export const scheduleRoundSchema = z.object({
  technicianId: z.string().uuid(),
  scheduledAt: z.string().datetime()
});

export const submitReportSchema = z.object({
  overallVerdict: z.string().min(1).max(40).optional(),
  priceAmount: z.number().nonnegative().optional(),
  priceCurrency: z.enum(['USD', 'SYP']).optional(),
  paidBy: z.enum(['SELLER', 'BUYER', 'RENTER', 'DRIVEX']).optional(),
  findings: z
    .array(
      z.object({
        description: z.string().min(1).max(1000),
        severity: z.enum(['MINOR', 'MODERATE', 'SEVERE', 'SAFETY_CRITICAL']),
        estimatedRepairCostAmount: z.number().nonnegative().optional(),
        estimatedRepairCostCurrency: z.enum(['USD', 'SYP']).optional()
      })
    )
    .default([])
});

export const createTechnicianSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  phone: z.string().max(30).optional(),
  serviceTiers: z.array(z.enum(['QUICK', 'COMPREHENSIVE'])).default([]),
  specialty: z.string().max(80).optional()
});

export const updateTechnicianSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional(),
  serviceTiers: z.array(z.enum(['QUICK', 'COMPREHENSIVE'])).optional(),
  specialty: z.string().max(80).optional(),
  isActive: z.boolean().optional()
});
