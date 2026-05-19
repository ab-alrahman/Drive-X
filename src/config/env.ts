import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(6000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'),
  REFRESH_TOKEN_TTL: z.string().default(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'),
  UPLOAD_DIR: z.string().default('uploads'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:6000'),
  ADMIN_WEB_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_DIR: z.string().default('logs'),
  DB_USER: z.string().default('postgres'),
  DB_HOST: z.string().default('localhost'),
  DB_NAME: z.string().default('drivex'),
  DB_PASSWORD: z.string().default('6582'),
  DB_PORT: z.coerce.number().int().positive().default(5432)
});

export const env = envSchema.parse(process.env);
