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
import {
  errataRoutes,
  faqRoutes,
  grimoireRoutes,
} from "./features/grimoire/routes.ts";
import previewsRouter from "./features/previews/routes.ts";
import profileRouter from "./features/profile/routes.ts";
import recommendationsRouter from "./features/recommendations/routes.ts";
import sealedDeckRouter from "./features/sealed-decks/routes.ts";
import settingsRouter from "./features/settings/routes.ts";
import v1PublicRouter from "./features/v1-public/routes.ts";
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

  // v1 route structure ported from old API, needs to stay consistent for outside consumers
  app.route("/auth/arkhamdb", arkhamdbOAuthRoutes);
  app.route("/v1/cache", cacheRouter);
  app.route("/v1/public", v1PublicRouter);

  app.route("/v2/public/additional_metadata", additionalMetadataRouter);
  app.route("/v2/public/arkhamdb-decklists", arkhamDbDecklistsRouter);
  app.route("/v2/public/customization-sheet", customizationSheetRouter);
  app.route("/v2/public/errata", errataRoutes);
  app.route("/v2/public/fan-made-project-info", fanMadeProjectInfoRouter);
  app.route("/v2/public/faq", faqRoutes);
  app.route("/v2/public/grimoire", grimoireRoutes);
  app.route("/v2/public/preview", previewsRouter);
  app.route("/v2/public/recommendations", recommendationsRouter);
  app.route("/v2/public/sealed-deck", sealedDeckRouter);

  app.route("/v2/auth", authRouter);
  app.route("/v2/decks", decksRouter);
  app.route("/v2/folders", foldersRouter);
  app.route("/v2/profile", profileRouter);
  app.route("/v2/settings", settingsRouter);

  app.onError(errorHandler);

  return app;
}
