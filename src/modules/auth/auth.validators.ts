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

