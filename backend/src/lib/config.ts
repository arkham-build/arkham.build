import { z } from "zod";

const repoRefSchema = z.string().transform((value) => {
  const separatorIndex = value.lastIndexOf("@");

  if (separatorIndex === -1 || separatorIndex === value.length - 1) {
    throw new Error(`Invalid repo ref: ${value}`);
  }

  return {
    repo: value.slice(0, separatorIndex),
    branch: value.slice(separatorIndex + 1),
  };
});

export const configSchema = z.object({
  ADMIN_API_KEY: z.string(),
  INGEST_JSON_DATA_REPO: repoRefSchema,
  INGEST_TABOO_DATA_REPO: repoRefSchema,
  INGEST_URL_ARKHAMDB_DECKLISTS: z.string(),
  CORS_ORIGINS: z.string(),
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
});

export type Config = z.infer<typeof configSchema>;
export type RepoRef = z.infer<typeof repoRefSchema>;

export function configFromEnv(
  overrides?: Record<string, string | number>,
): Config {
  const config = configSchema.parse({ ...process.env, ...overrides });
  return config;
}
