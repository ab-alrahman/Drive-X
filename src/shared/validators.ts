import { z } from 'zod';

/**
 * A person's name (used on account creation / profile update).
 * Rules: 2-120 chars after trimming, must contain at least one letter,
 * and must not contain any digit.
 */
export const personNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^\D*$/u, 'Name must not contain numbers')
  .regex(/\p{L}/u, 'Name must contain letters');
