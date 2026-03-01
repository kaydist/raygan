import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4000"),
  BIND_HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().optional(),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Redis (will be added later)
  REDIS_URL: z.string().optional(),

  // Encryption (will be added later)
  ENCRYPTION_KEY: z.string().optional(),

  // Allowed origins for CORS
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Frontend app URL (for redirects)
  APP_URL: z.string().default("http://localhost:3000"),

  // EAS Build
  EXPO_ACCESS_TOKEN: z.string().optional(),
  EXPO_ACCOUNT_NAME: z.string().optional(),
  EAS_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT, 10),
  isDev: parsed.data.NODE_ENV === "development",
  isProd: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
};

export type Env = typeof env;
