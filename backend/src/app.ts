import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Database } from "./db/db.ts";
import adminRouter from "./features/admin/routes.ts";
import arkhamDbDecklistsRouter from "./features/arkhamdb-decklists/routes.ts";
import authRouter from "./features/auth/routes.ts";
import decksRouter from "./features/decks/routes.ts";
import fanMadeProjectInfoRouter from "./features/fan-made-content/routes.ts";
import recommendationsRouter from "./features/recommendations/routes.ts";
import sealedDeckRouter from "./features/sealed-decks/routes.ts";
import settingsRouter from "./features/settings/routes.ts";
import { bodyLimitMiddleware } from "./lib/body-limit.ts";
import type { Config } from "./lib/config.ts";
import { corsMiddleware } from "./lib/cors.ts";
import type { EmailService } from "./lib/email/email-service.ts";
import { errorHandler } from "./lib/errors.ts";
import type { HonoEnv } from "./lib/hono-env.ts";
import { logger, requestLogger } from "./lib/logger.ts";
import cacheRouter from "./routes/cache.ts";

export function appFactory(
  config: Config,
  database: Database,
  emailService: EmailService,
) {
  const app = new Hono<HonoEnv>();

  app.use(secureHeaders());
  app.use(bodyLimitMiddleware());
  app.use(corsMiddleware(config));

  app.use(requestId());
  app.use(logger());
  app.use(requestLogger());

  app.use((c, next) => {
    c.set("db", database);
    c.set("config", config);
    c.set("emailService", emailService);
    return next();
  });

  app.route("/admin", adminRouter);

  app.route("/v1/cache", cacheRouter);

  const pub = new Hono<HonoEnv>();
  app.route("/admin", adminRouter);
  pub.route("/arkhamdb-decklists", arkhamDbDecklistsRouter);
  pub.route("/fan-made-project-info", fanMadeProjectInfoRouter);
  pub.route("/recommendations", recommendationsRouter);
  pub.route("/sealed-deck", sealedDeckRouter);
  app.route("/v2/public", pub);

  app.route("/v2/auth", authRouter);
  app.route("/v2/decks", decksRouter);
  app.route("/v2/settings", settingsRouter);

  app.onError(errorHandler);

  return app;
}
