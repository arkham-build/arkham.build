import { ACCOUNT_PERMISSIONS } from "@arkham-build/shared";
import { S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, vi } from "vitest";
import type { Database } from "../db/db.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

const DOWNLOAD_PATH = "/v2/account/scans/01001/download";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /v2/account/scans/:scanId/download", () => {
  test("returns 401 without an authenticated session", async ({
    dependencies,
  }) => {
    const response = await dependencies.app.request(DOWNLOAD_PATH);

    expect(response.status).toBe(401);
  });

  test("denies empty and unrelated permissions without accessing R2", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const send = vi.spyOn(S3Client.prototype, "send");

    for (const permissions of [[], ["decks:read"]]) {
      await setAccountPermissions(db, permissions);

      const response = await app.request(DOWNLOAD_PATH, {
        headers: { Cookie: sessionCookie },
      });

      expect(response.status).toBe(403);
    }

    expect(send).not.toHaveBeenCalled();
  });

  test("does not accept download permission from client input", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const send = vi.spyOn(S3Client.prototype, "send");
    await setAccountPermissions(db, []);

    const response = await app.request(
      `${DOWNLOAD_PATH}?permissions=${encodeURIComponent(ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD)}`,
      { headers: { Cookie: sessionCookie } },
    );

    expect(response.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  test("redirects an authorized account to a short-lived signed attachment URL", async ({
    dependencies,
  }) => {
    const { app, config, db, sessionCookie } = dependencies;
    await setAccountPermissions(db, [ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD]);
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockResolvedValue(undefined);

    const response = await app.request(DOWNLOAD_PATH, {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(send).toHaveBeenCalledTimes(1);

    const location = response.headers.get("Location");
    expect(location).not.toBeNull();
    if (!location) throw new Error("Signed redirect is missing its location");

    const signedUrl = new URL(location);
    const endpoint = new URL(config.SCANS_ENDPOINT);

    expect(signedUrl.protocol).toBe(endpoint.protocol);
    expect(signedUrl.hostname).toBe(
      `${config.SCANS_BUCKET}.${endpoint.hostname}`,
    );
    expect(signedUrl.pathname).toBe("/01001.jpg");
    expect(signedUrl.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(signedUrl.searchParams.get("response-content-disposition")).toBe(
      'attachment; filename="01001.jpg"',
    );
  });

  test("returns 404 when no scan object exists", async ({ dependencies }) => {
    const { app, db, sessionCookie } = dependencies;
    await setAccountPermissions(db, [ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD]);
    vi.spyOn(S3Client.prototype, "send").mockRejectedValue(
      s3Error("NotFound", 404),
    );

    const response = await app.request(DOWNLOAD_PATH, {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(404);
  });

  test("propagates non-not-found S3 errors as server errors", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    await setAccountPermissions(db, [ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD]);
    vi.spyOn(S3Client.prototype, "send").mockRejectedValue(
      s3Error("AccessDenied", 403),
    );

    const response = await app.request(DOWNLOAD_PATH, {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(500);
  });

  test("rejects malformed and traversal-style scan IDs without accessing R2", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    await setAccountPermissions(db, [ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD]);
    const send = vi.spyOn(S3Client.prototype, "send");

    for (const scanId of [
      "../01001",
      "folder/01001",
      "01001.jpg",
      "https://example.com/01001",
      "a".repeat(129),
    ]) {
      const response = await app.request(
        `/v2/account/scans/${encodeURIComponent(scanId)}/download`,
        { headers: { Cookie: sessionCookie } },
      );

      expect(response.status).toBe(400);
    }

    expect(send).not.toHaveBeenCalled();
  });
});

describe("GET /v2/account/auth/me", () => {
  test("returns normalized account permissions", async ({ dependencies }) => {
    const { app, db, sessionCookie } = dependencies;
    await setAccountPermissions(db, [
      ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD,
      "unrelated:permission",
    ]);

    const response = await app.request("/v2/account/auth/me", {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      account: {
        permissions: [ACCOUNT_PERMISSIONS.SCANS_DOWNLOAD],
      },
    });
  });
});

async function setAccountPermissions(db: Database, permissions: string[]) {
  await db
    .updateTable("account")
    .set({ permissions: JSON.stringify(permissions) })
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();
}

function s3Error(name: string, httpStatusCode: number) {
  return new S3ServiceException({
    $fault: "client",
    $metadata: { httpStatusCode },
    name,
  });
}
