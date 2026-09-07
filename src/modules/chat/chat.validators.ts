import { z } from 'zod';

export const createThreadSchema = z.object({
  carId: z.string().uuid()
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000)
});
