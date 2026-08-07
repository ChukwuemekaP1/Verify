import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().trim().min(1).default('/api/v1'),
  MONGODB_URI: z.string().trim().min(1).default('mongodb://127.0.0.1:27017/veriflow'),
  CLIENT_ORIGIN: z.string().trim().min(1).default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  REQUEST_SIZE_LIMIT: z.string().trim().min(1).default('10mb'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  JWT_SECRET: z.string().trim().min(32).default('veriflow-dev-secret-key-change-in-production-please-32ch'),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1).default('7d'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  BCRYPT_ROUNDS: z.coerce.number().int().positive().max(20).default(10),
  SUPER_ADMIN_EMAIL: z.string().trim().email().default('admin@veriflow.local'),
  SUPER_ADMIN_PASSWORD: z.string().trim().min(12).default('SuperAdmin123!'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().default(''),
  CLOUDINARY_API_KEY: z.string().trim().default(''),
  CLOUDINARY_API_SECRET: z.string().trim().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().trim().default('veriflow'),
  PUBLIC_VERIFY_BASE_URL: z.string().trim().min(1).default('http://localhost:5173/verify'),
  OCR_LANG_1: z.string().trim().default('eng'),
  OCR_LANG_2: z.string().trim().default(''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid backend environment variables', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
