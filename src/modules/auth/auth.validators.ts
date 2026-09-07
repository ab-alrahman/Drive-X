import { z } from 'zod';
import { personNameSchema } from '../../shared/validators';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20)
});

export const updateProfileSchema = z.object({
  fullName: personNameSchema
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(8).max(100)
});

