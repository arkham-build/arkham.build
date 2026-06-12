import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Database } from "./db/db.ts";
import additionalMetadataRouter from "./features/additional-metadata/routes.ts";
import adminRouter from "./features/admin/routes.ts";
import arkhamDbDecklistsRouter from "./features/arkhamdb-decklists/routes.ts";
import authRouter, {
  arkhamdbOAuthRoutes,
} from "./features/auth/routes/index.ts";
import cacheRouter from "./features/cache/routes.ts";
import customizationSheetRouter from "./features/customization_sheet/routes.ts";
import decksRouter from "./features/decks/routes.ts";
import fanMadeProjectInfoRouter from "./features/fan-made-content/routes.ts";
import foldersRouter from "./features/folders/routes.ts";
import grimoireRouter from "./features/grimoire/routes.ts";
import profileRouter from "./features/profile/routes.ts";
import recommendationsRouter from "./features/recommendations/routes.ts";
import sealedDeckRouter from "./features/sealed-decks/routes.ts";
import settingsRouter from "./features/settings/routes.ts";
import type { JobDispatcher } from "./jobs/dispatcher.ts";
import { bodyLimitMiddleware } from "./lib/body-limit.ts";
import type { Config } from "./lib/config.ts";
import { corsMiddleware } from "./lib/cors.ts";
import { errorHandler } from "./lib/errors.ts";
import type { HonoEnv } from "./lib/hono-env.ts";
import { logger, requestLogger } from "./lib/logger.ts";

export function appFactory(
  config: Config,
  database: Database,
  dispatcher: JobDispatcher,
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
    c.set("dispatcher", dispatcher);
    return next();
  });

  app.route("/admin", adminRouter);

  app.route("/v1/cache", cacheRouter);
  app.route("/v1/public", additionalMetadataRouter);

  const pub = new Hono<HonoEnv>();
  pub.route("/arkhamdb-decklists", arkhamDbDecklistsRouter);
  pub.route("/fan-made-project-info", fanMadeProjectInfoRouter);
  pub.route("/", grimoireRouter);
  pub.route("/recommendations", recommendationsRouter);
  pub.route("/sealed-deck", sealedDeckRouter);
  pub.route("/customization_sheet", customizationSheetRouter);
  app.route("/v2/public", pub);

  app.route("/v2/auth", authRouter);
  app.route("/v2/decks", decksRouter);
  app.route("/v2/folders", foldersRouter);
  app.route("/v2/profile", profileRouter);
  app.route("/v2/settings", settingsRouter);

  app.route("/auth/arkhamdb", arkhamdbOAuthRoutes);

  app.onError(errorHandler);

  return app;
}
