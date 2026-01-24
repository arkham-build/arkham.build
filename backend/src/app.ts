import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Database } from "./db/db.ts";
import { getAppDataVersions } from "./db/queries/app-data-versions.ts";
import { bodyLimitMiddleware } from "./lib/body-limit.ts";
import type { Config } from "./lib/config.ts";
import { corsMiddleware } from "./lib/cors.ts";
import type { EmailService } from "./lib/email/email-service.ts";
import { errorHandler } from "./lib/errors.ts";
import type { HonoEnv } from "./lib/hono-env.ts";
import { logger, requestLogger } from "./lib/logger.ts";
import arkhamDbDecklistsRouter from "./routes/arkhamdb-decklists.ts";
import authRouter from "./routes/auth.ts";
import recommendationsRouter from "./routes/recommendations.ts";

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

  const pub = new Hono<HonoEnv>();
  pub.route("/arkhamdb-decklists", arkhamDbDecklistsRouter);
  pub.route("/recommendations", recommendationsRouter);

  app.route("/v2/public", pub);
  app.route("/v2/auth", authRouter);

  app.get("/up", (c) => c.text("ok"));

  app.get("/version", async (c) => {
    const dataVersions = await getAppDataVersions(c.get("db"));
    if (!dataVersions) throw new Error("could not infer data versions");
    return c.json(dataVersions);
  });

  app.onError(errorHandler);

  return app;
}
