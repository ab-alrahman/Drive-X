import { z } from 'zod';

export const customerRegisterSchema = z.object({
  fullName: z.string().min(2).max(120),
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
