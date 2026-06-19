import { z } from "zod";

const repoRefSchema = z.string().transform(parseRepoRef);

export const configSchema = z.object({
  ARKHAMDB_BASE_URL: z.url(),
  ARKHAMDB_OAUTH_CLIENT_ID: z.string(),
  ARKHAMDB_OAUTH_CLIENT_SECRET: z.string(),
  ARKHAMDB_OAUTH_REDIRECT_URI: z.url(),
  ADMIN_API_KEY: z.string(),
  ENABLE_JOB_SCHEDULES: booleanString(true),
  ENABLE_LEGACY_SHARE_HISTORY_PROXY: booleanString(false),
  INGEST_JSON_DATA_REPO: repoRefSchema,
  INGEST_METADATA_REPO: repoRefSchema,
  INGEST_TABOO_DATA_REPO: repoRefSchema,
  INGEST_URL_ARKHAMDB_DECKLISTS: z.string(),
  CORS_ORIGINS: z.string(),
  FROM_EMAIL: z.email(),
  FRONTEND_URL: z.url(),
  LEGACY_API_BASE_URL: z.url(),
  HOSTNAME: z.string().default("localhost"),
  METADATA_LOCALES: z
    .preprocess(
      (s: string | undefined) => (s ?? "").split(",").map((s) => s.trim()),
      z.array(z.string()),
    )
    .default(["en"]),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1).max(65535),
  POSTGRES_DB: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_USER: z.string(),
  SESSION_COOKIE_NAME: z.string().default("arkham-build-session"),
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
  TURNSTILE_SECRET_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
});

export type Config = z.infer<typeof configSchema>;
export type RepoRef = z.infer<typeof repoRefSchema>;

export function configFromEnv(
  overrides?: Record<string, string | number>,
): Config {
  const config = configSchema.parse({ ...process.env, ...overrides });
  return config;
}

function booleanString(defaultValue: boolean) {
  return z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");
}

function parseRepoRef(value: string) {
  const separatorIndex = value.lastIndexOf("@");

  if (separatorIndex === -1 || separatorIndex === value.length - 1) {
    throw new Error(`Invalid repo ref: ${value}`);
  }

  return {
    repo: value.slice(0, separatorIndex),
    branch: value.slice(separatorIndex + 1),
  };
}
