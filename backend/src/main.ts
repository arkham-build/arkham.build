import { serve } from "@hono/node-server";
import { appFactory } from "./app.ts";
import { connectionString, getDatabase } from "./db/db.ts";
import { configSchema } from "./lib/config.ts";
import { createEmailService } from "./lib/email/email-service.ts";
import { SMTPMailer } from "./lib/email/mailer.ts";
import { log } from "./lib/logger.ts";

const config = configSchema.parse(process.env);
const database = getDatabase(connectionString(config));
const emailService = createEmailService(new SMTPMailer(config));

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
