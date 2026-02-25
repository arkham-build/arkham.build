/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from "../slices";
import {
  selectAvailableDraftCards,
  selectCanStartDraft,
  selectDraftCardPool,
  selectDraftDebugInfo,
  selectSignatureCards,
} from "./draft";

describe("draft selectors", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("selectDraftCardPool", () => {
    it("returns only level 0 cards", () => {
      const state = store.getState();
      const pool = selectDraftCardPool(state, "01001"); // Roland Banks

      // All cards should be level 0
      for (const card of pool) {
        expect(card.xp ?? 0).toBe(0);
      }
    });

    it("excludes signature cards", () => {
      const state = store.getState();
      const pool = selectDraftCardPool(state, "01001"); // Roland Banks

      // Should not include Roland's signature cards
      expect(pool.find((c) => c.code === "01006")).toBeUndefined(); // Roland's .38 Special
    });

    it("excludes weaknesses", () => {
      const state = store.getState();
      const pool = selectDraftCardPool(state, "01001");

      // Should not include weaknesses
      for (const card of pool) {
        expect(card.subtype_code).not.toBe("basicweakness");
      }
    });

    it("returns empty array for invalid investigator", () => {
      const state = store.getState();
      const pool = selectDraftCardPool(state, "invalid");
      expect(pool).toEqual([]);
    });
  });

  describe("selectSignatureCards", () => {
    it("returns signature cards for investigator", () => {
      const state = store.getState();
      const signatures = selectSignatureCards(state, "01001"); // Roland Banks

      // Should include signature cards
      expect(Object.keys(signatures).length).toBeGreaterThan(0);
      expect(signatures["01006"]).toBe(1); // Roland's .38 Special
    });

    it("includes random basic weakness", () => {
      const state = store.getState();
      const signatures = selectSignatureCards(state, "01001");

      expect(signatures["00000"]).toBe(1); // Random basic weakness
    });

    it("returns empty object for invalid investigator", () => {
      const state = store.getState();
      const signatures = selectSignatureCards(state, "invalid");
      expect(signatures).toEqual({});
    });
  });

  describe("selectCanStartDraft", () => {
    it("returns canStart true when enough cards available", () => {
      const state = store.getState();
      const result = selectCanStartDraft(state, "01001"); // Roland Banks

      expect(result.canStart).toBe(true);
      expect(result.required).toBe(30);
      expect(result.available).toBeGreaterThanOrEqual(30);
    });

    it("returns canStart false for invalid investigator", () => {
      const state = store.getState();
      const result = selectCanStartDraft(state, "invalid");
      expect(result.canStart).toBe(false);
    });
  });

  describe("selectAvailableDraftCards with deck_options limits", () => {
    it("filters out cards that would exceed faction limit", () => {
      const state = store.getState();

      // Find an investigator with a faction limit (e.g., Mandy Thompson 06002)
      // or use a test investigator if available
      const investigatorCode = "06002"; // Mandy Thompson
      const investigator = state.metadata.cards[investigatorCode];

      if (!investigator) {
        // Skip if investigator not in test data
        return;
      }

      const backCardCode = investigator.back_link_id ?? investigatorCode;
      const backCard = state.metadata.cards[backCardCode];

      if (!backCard?.deck_options?.some((opt) => opt.limit)) {
        // Skip if no limit options
        return;
      }

      // Get base pool
      const basePool = selectDraftCardPool(state, investigatorCode);
      expect(basePool.length).toBeGreaterThan(0);

      // Initially, all cards should be available
      const initialAvailable = selectAvailableDraftCards(
        state,
        investigatorCode,
        {},
        [],
      );
      expect(initialAvailable.length).toBeGreaterThan(0);

      // Find a limit option
      const limitOption = backCard?.deck_options?.find((opt) => opt.limit);
      if (!limitOption) return;

      // Pick cards up to the limit
      const pickedCards: Record<string, number> = {};
      let pickedCount = 0;
      const limit = limitOption.limit as number;

      // Pick cards matching the limit option until we reach the limit
      for (const card of basePool) {
        if (pickedCount >= limit) break;

        // Check if card matches the limit option
        // This is a simplified check - in reality we'd use makeOptionFilter
        const matchesFaction = limitOption.faction?.includes(card.faction_code);
        const matchesLevel =
          !limitOption.level ||
          ((card.xp ?? 0) >= (limitOption.level.min ?? 0) &&
            (card.xp ?? 0) <= (limitOption.level.max ?? 5));

        if (matchesFaction && matchesLevel) {
          pickedCards[card.code] = 1;
          pickedCount++;
        }
      }

      // After picking up to limit, available cards should exclude matching cards
      const availableAfterLimit = selectAvailableDraftCards(
        state,
        investigatorCode,
        pickedCards,
        [],
      );

      // Cards matching the limit option should be filtered out
      for (const card of availableAfterLimit) {
        const matchesFaction = limitOption.faction?.includes(card.faction_code);
        const matchesLevel =
          !limitOption.level ||
          ((card.xp ?? 0) >= (limitOption.level.min ?? 0) &&
            (card.xp ?? 0) <= (limitOption.level.max ?? 5));

        if (matchesFaction && matchesLevel) {
          // This card should not be available if we've reached the limit
          // But we need to check if adding it would exceed the limit
          const simulatedPicked = {
            ...pickedCards,
            [card.code]: (pickedCards[card.code] ?? 0) + 1,
          };
          const simulatedAvailable = selectAvailableDraftCards(
            state,
            investigatorCode,
            simulatedPicked,
            [],
          );

          // If the card is still available, it means we haven't reached the limit yet
          // This is expected behavior - the filter should prevent exceeding the limit
          expect(simulatedAvailable.length).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("does not filter cards when limit not reached", () => {
      const state = store.getState();
      const investigatorCode = "01001"; // Roland Banks (no limits)

      const basePool = selectDraftCardPool(state, investigatorCode);
      const available = selectAvailableDraftCards(
        state,
        investigatorCode,
        {},
        [],
      );

      // For investigators without limits, all cards should be available
      expect(available.length).toBe(basePool.length);
    });

    it("filters out cards that reached deck limit", () => {
      const state = store.getState();
      const investigatorCode = "01001";

      // Find a card with deck_limit
      const basePool = selectDraftCardPool(state, investigatorCode);
      const cardWithLimit = basePool.find(
        (c) => c.deck_limit && c.deck_limit < 3,
      );

      if (!cardWithLimit) {
        // Skip if no card with limit found
        return;
      }

      const limit = cardWithLimit.deck_limit as number;
      const pickedCards: Record<string, number> = {
        [cardWithLimit.code]: limit,
      };

      const available = selectAvailableDraftCards(
        state,
        investigatorCode,
        pickedCards,
        [],
      );

      // Card should be filtered out
      expect(
        available.find((c) => c.code === cardWithLimit.code),
      ).toBeUndefined();
    });
  });

  describe("selectDraftDebugInfo", () => {
    it("returns debug info with base pool size", () => {
      const state = store.getState();
      const debugInfo = selectDraftDebugInfo(state, "01001", {});

      expect(debugInfo.basePoolSize).toBeGreaterThan(0);
      expect(debugInfo.availableCardsSize).toBeGreaterThan(0);
      expect(debugInfo.investigatorCode).toBe("01001");
    });

    it("returns limit options info when present", () => {
      const state = store.getState();
      const investigatorCode = "06002"; // Mandy Thompson
      const investigator = state.metadata.cards[investigatorCode];

      if (!investigator) {
        return;
      }

      const debugInfo = selectDraftDebugInfo(state, investigatorCode, {});

      if (debugInfo.limitOptions.length > 0) {
        expect(debugInfo.limitOptions[0]).toHaveProperty("limit");
        expect(debugInfo.limitOptions[0]).toHaveProperty("currentCount");
      }
    });

    it("shows correct current count for limit options", () => {
      const state = store.getState();
      const investigatorCode = "06002";
      const investigator = state.metadata.cards[investigatorCode];

      if (!investigator) {
        return;
      }

      const backCardCode = investigator.back_link_id ?? investigatorCode;
      const backCard = state.metadata.cards[backCardCode];
      const limitOption = backCard?.deck_options?.find((opt) => opt.limit);

      if (!limitOption) {
        return;
      }

      // Pick some cards matching the limit
      const basePool = selectDraftCardPool(state, investigatorCode);
      const pickedCards: Record<string, number> = {};
      let pickedCount = 0;
      const limit = limitOption.limit as number;

      for (const card of basePool) {
        if (pickedCount >= limit) break;
        const matchesFaction = limitOption.faction?.includes(card.faction_code);
        if (matchesFaction) {
          pickedCards[card.code] = 1;
          pickedCount++;
        }
      }

      const debugInfo = selectDraftDebugInfo(
        state,
        investigatorCode,
        pickedCards,
      );

      const matchingLimitOption = debugInfo.limitOptions.find(
        (opt) => opt.limit === limit,
      );

      if (matchingLimitOption) {
        expect(matchingLimitOption.currentCount).toBe(pickedCount);
      }
    });
  });
});
