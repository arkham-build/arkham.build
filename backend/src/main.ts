import { serve } from "@hono/node-server";
import { appFactory } from "./app.ts";
import { connectionString, getDatabase } from "./db/db.ts";
import { configSchema } from "./lib/config.ts";
import { log } from "./lib/logger.ts";

const config = configSchema.parse(process.env);
const database = getDatabase(connectionString(config));

const app = appFactory(config, database);

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
