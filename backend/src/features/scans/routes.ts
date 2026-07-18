import {
  ACCOUNT_PERMISSIONS,
  AccountPermissionsSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { type ScansStorage, ScanIdSchema } from "./storage.ts";

const RouteScanIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .pipe(ScanIdSchema);

export function createScansRoutes(scansStorage: ScansStorage) {
  const routes = new Hono<HonoEnv>();

  routes.get("/:scanId/download", sessionAuth(), async (c) => {
    const permissions = AccountPermissionsSchema.parse(
      c.get("account").permissions,
    );

    if (!permissions.includes(ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    const scanId = RouteScanIdSchema.safeParse(c.req.param("scanId"));

    if (!scanId.success) {
      throw new HTTPException(400, {
        message: "Invalid scan ID",
        cause: scanId.error,
      });
    }

    const downloadUrl = await scansStorage.createDownloadUrl(scanId.data);

    c.header("Cache-Control", "private, no-store");
    return c.redirect(downloadUrl);
  });

  return routes;
}
