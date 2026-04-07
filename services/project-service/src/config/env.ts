import * as dotenv from 'dotenv';
dotenv.config();
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8005').transform((v) => parseInt(v, 10)),

  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }),
  REDIS_URL: z.string().url().optional(),
  REDIS_TLS: z.enum(['true', 'false']).default('false'),

  PUBSUB_PROJECT_ID: z.string().optional(),
  PUBSUB_EMULATOR_HOST: z.string().optional(),

  // Firebase Admin — explicit SA key OR ADC/Workload Identity (Cloud Run)
  FIREBASE_PROJECT_ID: z.string({ required_error: 'FIREBASE_PROJECT_ID is required' }),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string({ required_error: 'FIREBASE_STORAGE_BUCKET is required' }),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  GCP_PROJECT_ID: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
  CLOUD_TRACE_ENABLED: z.enum(['true', 'false']).default('false'),

  // Cloud SQL (Cloud Run — Unix socket connection)
  CLOUD_SQL_CONNECTION_NAME: z.string().optional(), // e.g. project:region:instance
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[project-service] Invalid environment variables:\n', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
