export const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8788";

export const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/arkham_build_e2e";

export const frontendUrl =
  process.env.E2E_FRONTEND_URL ?? "http://localhost:3100";

export const mailcrabUrl =
  process.env.E2E_MAILCRAB_URL ?? "http://localhost:1080";

export const sessionCookieName =
  process.env.E2E_SESSION_COOKIE_NAME ?? "arkham-build-session";
