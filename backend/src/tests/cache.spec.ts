import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v1/cache", () => {
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
