import fanMadeProject from "@test/fixtures/stubs/fan_made_investigator_project.json" with { type: "json" };
import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { selectMetadata } from "@/store/selectors/shared";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from "../slices";
import {
  selectCanonicalTabooSetId,
  selectListCards,
  selectListTabooSetId,
} from "./lists";

describe("selectListCards", () => {
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    store = await getMockStore();
  });

  it("includes the selected investigator when filtering by investigator access", () => {
    store.getState().setActiveList("index");

    const investigatorFilter = Object.entries(
      store.getState().lists.index.filterValues,
    ).find(([, filter]) => filter.type === "investigator");

    if (!investigatorFilter) {
      throw new Error("expected the index list to have an investigator filter");
    }

    store.getState().setFilterValue(Number(investigatorFilter[0]), "01001");

    const result = selectListCards(store.getState(), undefined, undefined);

    expect(result?.cards.map((card) => card.code)).toContain("01001");
  });

  it("includes the selected investigator when filtering with BuildQL", () => {
    store.getState().setActiveList("index");
    store.getState().setSearchValue('investigator_access = "01001"');

    const result = selectListCards(store.getState(), undefined, undefined);

    expect(result?.cards.map((card) => card.code)).toContain("01001");
  });

  it("hides cached cards that are no longer in an installed project", async () => {
    await store.getState().addFanMadeProject(fanMadeProject);

    const state = store.getState();
    const projectCard = fanMadeProject.data.cards.at(0);
    if (!projectCard) throw new Error("expected fan-made project card");
    const installedCode = projectCard.code;
    const installedCard = selectMetadata(state).cards[installedCode];
    if (!installedCard) throw new Error("expected installed fan-made card");
    const deletedCode = `${installedCode}-deleted`;

    store.setState((current) => ({
      ui: {
        ...current.ui,
        fanMadeContentCache: {
          ...current.ui.fanMadeContentCache,
          cards: {
            ...current.ui.fanMadeContentCache.cards,
            [deletedCode]: {
              ...installedCard,
              code: deletedCode,
              id: deletedCode,
            },
          },
        },
      },
    }));
    store.getState().setActiveList("index");

    const cardCodes = selectListCards(
      store.getState(),
      undefined,
      undefined,
    )?.cards.map((card) => card.code);

    expect(cardCodes).toContain(installedCode);
    expect(cardCodes).not.toContain(deletedCode);
  });

  it("applies a taboo override only to the active list", () => {
    store.setState((state) => ({
      settings: {
        ...state.settings,
        tabooSetId: 1,
      },
    }));
    store.getState().setActiveList("index");

    expect(selectCanonicalTabooSetId(store.getState(), undefined)).toBe(1);
    expect(findCard("02002")?.taboo_set_id).toBe(1);

    store.getState().setListTabooSetOverride(6);

    expect(selectCanonicalTabooSetId(store.getState(), undefined)).toBe(6);
    expect(findCard("02002")?.taboo_set_id).toBe(6);
    expect(store.getState().settings.tabooSetId).toBe(1);

    const tabooFilter = Object.entries(
      store.getState().lists.index.filterValues,
    ).find(([, filter]) => filter.type === "taboo_set");

    if (!tabooFilter) {
      throw new Error("expected the index list to have a taboo set filter");
    }

    store.getState().setFilterValue(Number(tabooFilter[0]), 1);

    expect(selectListTabooSetId(store.getState())).toBe(6);
    expect(selectCanonicalTabooSetId(store.getState(), undefined)).toBe(1);
    expect(findCard("02002")?.taboo_set_id).toBe(1);

    store.getState().setFilterValue(Number(tabooFilter[0]), undefined);

    expect(selectCanonicalTabooSetId(store.getState(), undefined)).toBe(6);

    store.getState().setActiveList("create_deck");
    expect(selectCanonicalTabooSetId(store.getState(), undefined)).toBe(1);

    store.getState().setActiveList("index");
    store.getState().setListTabooSetOverride(null);

    expect(selectCanonicalTabooSetId(store.getState(), undefined)).toBeNull();
    expect(findCard("02002")?.taboo_set_id).toBeUndefined();
  });

  function findCard(code: string) {
    return selectListCards(store.getState(), undefined, undefined)?.cards.find(
      (card) => card.code === code,
    );
  }
});
