import { describe, expect, it } from "vitest";
import { getInitialSettings } from "../slices/settings";
import { fromRemoteSettings, toRemoteSettings } from "./settings-sync";

describe("toRemoteSettings()", () => {
  it("excludes local-only settings and collection", () => {
    const settings = {
      ...getInitialSettings(),
      collection: { core: 2 },
      devModeEnabled: true,
      fontSize: 125,
    };

    const remote = toRemoteSettings(settings);

    expect(remote).not.toHaveProperty("collection");
    expect(remote).not.toHaveProperty("devModeEnabled");
    expect(remote).not.toHaveProperty("fontSize");
  });

  it("keeps unset synced optionals undefined", () => {
    const settings = {
      ...getInitialSettings(),
      cardShowCollectionNumber: undefined,
      cardShowUniqueIcon: undefined,
      flags: undefined,
      tabooSetId: undefined,
    };

    const remote = toRemoteSettings(settings);

    expect(remote).not.toBeNull();
    expect(remote?.cardShowCollectionNumber).toBeUndefined();
    expect(remote?.cardShowUniqueIcon).toBeUndefined();
    expect(remote?.flags).toBeUndefined();
    expect(remote?.tabooSetId).toBeUndefined();
  });
});

describe("fromRemoteSettings()", () => {
  it("preserves local-only settings and collection", () => {
    const localSettings = {
      ...getInitialSettings(),
      collection: { core: 1 },
      devModeEnabled: true,
      fontSize: 140,
      locale: "en",
      showPreviews: false,
    };

    const remote = toRemoteSettings({
      ...getInitialSettings(),
      collection: { dunwich: 2 },
      devModeEnabled: false,
      fontSize: 90,
      locale: "de",
      showPreviews: true,
    });

    expect(fromRemoteSettings(remote, localSettings)).toMatchObject({
      collection: { core: 1 },
      devModeEnabled: true,
      fontSize: 140,
      locale: "de",
      showPreviews: true,
    });
  });

  it("preserves omitted optionals as undefined", () => {
    const localSettings = {
      ...getInitialSettings(),
      cardShowCollectionNumber: true,
      cardShowUniqueIcon: true,
      flags: { feature: true },
      tabooSetId: 42,
    };

    const remote = toRemoteSettings({
      ...getInitialSettings(),
      cardShowCollectionNumber: undefined,
      cardShowUniqueIcon: undefined,
      flags: undefined,
      tabooSetId: undefined,
    });

    const next = fromRemoteSettings(remote, localSettings);

    expect(next.cardShowCollectionNumber).toBeUndefined();
    expect(next.cardShowUniqueIcon).toBeUndefined();
    expect(next.flags).toBeUndefined();
    expect(next.tabooSetId).toBeUndefined();
  });

  it("returns local settings when no remote settings exist", () => {
    const localSettings = {
      ...getInitialSettings(),
      fontSize: 110,
    };

    expect(fromRemoteSettings(null, localSettings)).toBe(localSettings);
  });
});
