import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import { VERSION } from "../persist/storage";
import type { StoreState } from "../slices";
import { prepareBackup, restoreBackup } from "./backup";

describe("prepareBackup()", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("creates a backup file", () => {
    const backup = prepareBackup(store.getState());
    const parsed = JSON.parse(backup);
    expect(parsed.version).toEqual(VERSION);
    expect(parsed.data.data).toBeDefined();
    expect(parsed.data.metadata).not.toBeDefined();
  });
});

describe("restoreBackup", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("restores a backup file", async () => {
    const state = store.getState();
    state.app.clientId = "Test";

    const backup = prepareBackup(store.getState());

    const next = await restoreBackup(
      store.getState(),
      new File([backup], "backup.json"),
    );

    expect(next.app.clientId).toEqual(state.app.clientId);
  });
});
