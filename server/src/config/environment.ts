import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.string().optional(),
  API_KEY: z.string().min(1).default('dev-api-key'),
  EMAIL_FETCH_CRON: z.string().default('*/15 * * * *'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
