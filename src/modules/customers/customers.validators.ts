import { z } from 'zod';
import { personNameSchema } from '../../shared/validators';

export const customerRegisterSchema = z.object({
  fullName: personNameSchema,
  email: z.string().email(),
  phone: z.string().min(6).max(30).optional(),
  password: z.string().min(8).max(100)
});

export const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

export const customerRefreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const updateProfileSchema = z.object({
  fullName: personNameSchema.optional(),
  phone: z.string().min(6).max(30).optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(8).max(100)
});
