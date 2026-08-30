import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20)
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(8).max(100)
});

