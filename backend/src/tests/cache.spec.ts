import { gunzipSync } from "node:zlib";
import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v1/cache", () => {
  test("gzips cache responses when the client accepts gzip", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v1/cache/version", {
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip",
      },
    });

    expect(res.headers.get("Content-Encoding")).toBe("gzip");
    expect(res.headers.get("Vary")).toContain("Accept-Encoding");

    const body = gunzipSync(Buffer.from(await res.arrayBuffer())).toString(
      "utf8",
    );

    expect(JSON.parse(body)).toMatchObject({
      data: {
        all_card_updated: expect.any(Array),
      },
    });
  });

  test("returns 304 for matching etags", async ({ dependencies }) => {
    const initialRes = await dependencies.app.request("/v1/cache/metadata");
    const etag = initialRes.headers.get("ETag");

    expect(etag).toBeTruthy();

    const res = await dependencies.app.request("/v1/cache/metadata", {
      headers: {
        // biome-ignore lint/style/noNonNullAssertion: test code.
        "If-None-Match": etag!,
      },
    });

    expect(res.status).toBe(304);
    expect(res.headers.get("ETag")).toBe(etag);
    expect(await res.text()).toBe("");
  });
});
