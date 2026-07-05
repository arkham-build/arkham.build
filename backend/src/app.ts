import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Database } from "./db/db.ts";
import additionalMetadataRouter from "./features/additional-metadata/routes.ts";
import adminRouter from "./features/admin/routes.ts";
import arkhamDbDecklistsRouter from "./features/arkhamdb-decklists/routes.ts";
import authRouter, {
  arkhamdbOAuthCallbackRoutes,
  arkhamdbOAuthRoutes,
} from "./features/auth/routes/index.ts";
import cacheRouter from "./features/cache/routes.ts";
import cardTagsRouter from "./features/card-tags/routes.ts";
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
import {
  authenticatedCorsMiddleware,
  publicCorsMiddleware,
} from "./lib/cors.ts";
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

  app.use(requestId());
  app.use(logger());
  app.use(requestLogger());

  app.use((c, next) => {
    c.set("db", database);
    c.set("config", config);
    c.set("dispatcher", dispatcher);
    return next();
  });

  const publicCors = publicCorsMiddleware(config);
  const authenticatedCors = authenticatedCorsMiddleware(config);
  const bodyLimit = bodyLimitMiddleware();

  const v1 = new Hono<HonoEnv>();
  v1.use("*", publicCors);
  v1.use("*", bodyLimit);
  v1.route("/cache", cacheRouter);
  v1.route("/public", v1PublicRouter);
  app.route("/v1", v1);

  const v2Public = new Hono<HonoEnv>();
  v2Public.use("*", publicCors);
  v2Public.use("*", bodyLimit);
  v2Public.route("/additional_metadata", additionalMetadataRouter);
  v2Public.route("/arkhamdb-decklists", arkhamDbDecklistsRouter);
  v2Public.route("/customization-sheet", customizationSheetRouter);
  v2Public.route("/errata", errataRoutes);
  v2Public.route("/fan-made-project-info", fanMadeProjectInfoRouter);
  v2Public.route("/faq", faqRoutes);
  v2Public.route("/grimoire", grimoireRoutes);
  v2Public.route("/preview", previewsRouter);
  v2Public.route("/recommendations", recommendationsRouter);
  v2Public.route("/sealed-deck", sealedDeckRouter);
  app.route("/v2/public", v2Public);

  const v2Account = new Hono<HonoEnv>();
  v2Account.use("*", authenticatedCors);
  v2Account.use("*", bodyLimit);
  v2Account.route("/auth", authRouter);
  v2Account.route("/card-tags", cardTagsRouter);
  v2Account.route("/decks", decksRouter);
  v2Account.route("/folders", foldersRouter);
  v2Account.route("/profile", profileRouter);
  v2Account.route("/settings", settingsRouter);
  app.route("/v2/account", v2Account);

  app.route("/admin", adminRouter);
  app.route("/auth", arkhamdbOAuthCallbackRoutes);
  app.route("/auth/arkhamdb", arkhamdbOAuthRoutes);

  app.onError(errorHandler);

  return app;
}
