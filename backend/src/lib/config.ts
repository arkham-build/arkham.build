import { z } from "zod";

export const configSchema = z.object({
  INGEST_URL_ARKHAMDB_DECKLISTS: z.string(),
  CORS_ORIGINS: z.string(),
  HOSTNAME: z.string().default("localhost"),
  INGEST_URL_METADATA: z.string(),
  METADATA_LOCALES: z
    .preprocess(
      (s: string | undefined) => (s ?? "").split(",").map((s) => s.trim()),
      z.array(z.string()),
    )
    .default(["en"]),
  METADATA_VERSION: z.coerce.number().int().default(8),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1).max(65535),
  POSTGRES_DB: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_USER: z.string(),
  SESSION_COOKIE_NAME: z.string().default("arkham_session"),
  SESSION_EXPIRY_HOURS: z.coerce.number().int().positive().default(720),
  SESSION_SECRET: z.string().min(32),
  VERIFICATION_TOKEN_EXPIRY_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(24),
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  POSTMARK_API_TOKEN: z.string(),
  POSTMARK_FROM_EMAIL: z.string().email(),
  FRONTEND_URL: z.string().url(),
});

export type Config = z.infer<typeof configSchema>;

export function configFromEnv(
  overrides?: Record<string, string | number>,
): Config {
  const config = configSchema.parse({ ...process.env, ...overrides });
  return config;
}
