import { z } from 'zod';

const schema = z.object({
  PORT:         z.string().default('8004').transform(Number),
  NODE_ENV:     z.enum(['development', 'test', 'production']).default('development'),
  SERVICE_NAME: z.string().default('jobs-service'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_PROJECT_ID:            z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  TYPESENSE_HOST:     z.string().default('localhost'),
  TYPESENSE_PORT:     z.string().default('8108').transform(Number),
  TYPESENSE_PROTOCOL: z.enum(['http', 'https']).default('http'),
  TYPESENSE_API_KEY:  z.string().min(1),

  GCP_PROJECT_ID:                    z.string().min(1),
  PUBSUB_JOB_CREATED_TOPIC:          z.string().default('infra.job.created'),
  PUBSUB_JOB_UPDATED_TOPIC:          z.string().default('infra.job.updated'),
  PUBSUB_APPLICATION_CREATED_TOPIC:  z.string().default('infra.application.created'),

  USERS_SERVICE_URL:         z.string().url().optional(),
  NOTIFICATIONS_SERVICE_URL: z.string().url().optional(),

  SENTRY_DSN: z.string().optional(),
});

function parseEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('[jobs-service] Invalid environment variables:');
    result.error.issues.forEach((i) => console.error(` - ${i.path.join('.')}: ${i.message}`));
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
