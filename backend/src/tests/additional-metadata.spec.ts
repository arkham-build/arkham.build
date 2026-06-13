import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v1/public/additional_metadata/:id", () => {
  test("returns additional metadata by id", async ({ dependencies }) => {
    const { app, db } = dependencies;
    const data = {
      fan_made_content: ["fan-made-project"],
      hidden_slots: { "01001": 1 },
    };

    const row = await db
      .insertInto("arkhamdb_deck_additional_metadata")
      .values({
        data,
        deck_id: 123,
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    const res = await app.request(`/v2/public/additional_metadata/${row.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });

  test("returns 404 when additional metadata is not found", async ({
    dependencies,
  }) => {
    const { app } = dependencies;

    const res = await app.request("/v1/public/additional_metadata/missing");

    expect(res.status).toBe(404);
  });
});
