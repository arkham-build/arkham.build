import { serve } from "@hono/node-server";
import { appFactory } from "./app.ts";
import { connectionString, getDatabase } from "./db/db.ts";
import { configSchema } from "./lib/config.ts";
import { DebugMailer, EmailService, SESMailer } from "./lib/email.ts";
import { log } from "./lib/logger.ts";

const config = configSchema.parse(process.env);
const database = getDatabase(connectionString(config));
const emailService = new EmailService(
  config.AWS_ACCESS_KEY_ID ? new SESMailer(config) : new DebugMailer(),
  config.FRONTEND_URL,
);

const app = appFactory(config, database, emailService);

serve(
  {
    fetch: app.fetch,
    port: config.PORT,
  },
  (info) => {
    log("info", "Application started", {
      address: info.address,
      port: info.port,
    });
  },
);
