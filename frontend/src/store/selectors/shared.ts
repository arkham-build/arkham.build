import { createSelector } from "reselect";
import { official } from "@/utils/card-utils";
import { PREVIEW_PACKS } from "@/utils/constants";
import i18n from "@/utils/i18n";
import { isEmpty } from "@/utils/is-empty";
import { time, timeEnd } from "@/utils/time";
import { ownedCardCount } from "../lib/card-ownership";
import { addProjectToMetadata, cloneMetadata } from "../lib/fan-made-content";
import { createLookupTables } from "../lib/lookup-tables";
import type { ResolvedDeck } from "../lib/types";
import type { Card } from "../schemas/card.schema";
import type { Cycle } from "../schemas/cycle.schema";
import type { Pack } from "../schemas/pack.schema";
import type { StoreState } from "../slices";
import type { Metadata } from "../slices/metadata.types";

export const selectMetadata = createSelector(
  (state: StoreState) => state.metadata,
  (state: StoreState) => state.fanMadeData.projects,
  (state: StoreState) => state.ui.fanMadeContentCache,
  (metadata, fanMadeProjects, cache) => {
    const projects = Object.values(fanMadeProjects);

    if (isEmpty(projects) && isEmpty(cache?.cards)) return metadata;

    time("select_custom_data");

    const meta = cloneMetadata(metadata);

    for (const project of projects) {
      addProjectToMetadata(meta, project);
    }

    if (cache?.cycles) {
      for (const cycle of Object.values(cache.cycles)) {
        if (!meta.cycles[cycle.code]) {
          meta.cycles[cycle.code] = cycle;
        }
      }
    }

    if (cache?.packs) {
      for (const pack of Object.values(cache.packs)) {
        if (!meta.packs[pack.code]) {
          meta.packs[pack.code] = pack;
        }
      }
    }

    if (cache?.cards) {
      for (const card of Object.values(cache.cards)) {
        if (!meta.cards[card.code]) {
          meta.cards[card.code] = card;
        }
      }
    }

    if (cache?.encounter_sets) {
      for (const set of Object.values(cache.encounter_sets)) {
        if (!meta.encounterSets[set.code]) {
          meta.encounterSets[set.code] = set;
        }
      }
    }

    timeEnd("select_custom_data");

    return meta as Metadata;
  },
);

export const selectLookupTables = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  (metadata, settings) => {
    return createLookupTables(metadata, settings);
  },
);

export const selectClientId = (state: StoreState) => {
  return state.app.clientId;
};

export const selectIsInitialized = (state: StoreState) => {
  return state.ui.initialized;
};

export const selectCanCheckOwnership = (state: StoreState) =>
  !state.settings.showAllCards;

export const selectCollection = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  (metadata, settings) => {
    const collection = {
      ...settings.collection,
      ...Object.fromEntries(
        Object.entries(metadata.packs)
          .filter(([, pack]) => !official(pack))
          .map((pack) => [pack[0], 1]),
      ),
    };

    return settings.showPreviews
      ? {
          ...collection,
          ...PREVIEW_PACKS.reduce(
            (acc, code) => {
              acc[code] = 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        }
      : collection;
  },
);

export const selectCardOwnedCount = createSelector(
  selectMetadata,
  selectLookupTables,
  selectCollection,
  (state: StoreState) => state.settings,
  (metadata, lookupTables, collection, settings) => {
    return (card: Card) => {
      return ownedCardCount(
        card,
        metadata,
        lookupTables,
        collection,
        settings.showAllCards,
      );
    };
  },
);

export const selectConnectionLock = createSelector(
  (state: StoreState) => state.remoting,
  (remoting) => {
    return remoting.sync || remoting.arkhamdb
      ? i18n.t("settings.connections.lock", { provider: "ArkhamDB" })
      : undefined;
  },
);

export const selectConnectionLockForDeck = createSelector(
  selectConnectionLock,
  (_: StoreState, deck: ResolvedDeck) => deck,
  (remoting, deck) => {
    return remoting && deck.source === "arkhamdb" ? remoting : undefined;
  },
);

export const selectBackCard = createSelector(
  selectMetadata,
  selectLookupTables,
  (_: StoreState, code: string) => code,
  (metadata, lookupTables, code) => {
    const card = metadata.cards[code];
    if (!card) return undefined;

    if (card.back_link_id) {
      return metadata.cards[card.back_link_id];
    }

    if (card.hidden) {
      const backCode = Object.keys(
        lookupTables.relations.fronts[code] ?? {},
      ).at(0);

      return backCode ? metadata.cards[backCode] : undefined;
    }

    return undefined;
  },
);

export const selectLocaleSortingCollator = createSelector(
  (state: StoreState) => state.settings,
  (settings) => {
    return new Intl.Collator(settings.locale, {
      ignorePunctuation: settings.sortIgnorePunctuation,
      sensitivity: "base",
      usage: "sort",
    });
  },
);

export function selectSettingsTabooId(
  settings: StoreState["settings"],
  metadata: Metadata,
) {
  const tabooSetId = settings.tabooSetId;

  if (tabooSetId === "latest") {
    const id = Object.keys(metadata.tabooSets)
      .sort((a, b) => +a - +b) // INVARIANT: taboo set ids are integers
      .pop();
    return id ? +id : undefined;
  }

  return tabooSetId;
}

export const selectCardMapper = createSelector(selectMetadata, (metadata) => {
  return (code: string) => metadata.cards[code];
});

export const selectTraitMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      const key = `common.traits.${code}`;
      const name = i18n.exists(key) ? i18n.t(key) : code;
      return { code, name };
    };
  },
);

export const selectSkillMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      return {
        code,
        name: i18n.t(`common.skill.${code}`),
      };
    };
  },
);

export type Printing = {
  id: string;
  card: Card;
  pack: Pack;
  cycle: Cycle;
};

export const selectActiveList = (state: StoreState) => {
  const active = state.activeList;
  return active ? state.lists[active] : undefined;
};

export const selectShowFanMadeRelations = createSelector(
  selectActiveList,
  (state: StoreState) => state.settings.cardListsDefaultContentType,
  (activeList, defaultContentType) => {
    if (activeList) {
      const { filters, filterValues } = activeList;

      const idx = filters.indexOf("fan_made_content");
      const filterValue = idx !== -1 ? filterValues[idx] : undefined;

      if (filterValue != null) return filterValue.value !== "official";
    }

    return defaultContentType !== "official";
  },
);

export const selectPrintingsForCard = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (state: StoreState) => state.settings.showPreviews,
  selectShowFanMadeRelations,
  (_: StoreState, code: string) => code,
  (
    metadata,
    lookupTables,
    collator,
    showPreviews,
    showFanMadeRelations,
    cardCode,
  ) => {
    const duplicates = Object.keys(
      lookupTables.relations.duplicates[cardCode] ?? {},
    );

    const reprints = Object.keys(
      lookupTables.relations.reprints[cardCode] ?? {},
    );

    const basePrints = Object.keys(
      lookupTables.relations.basePrints[cardCode] ?? {},
    );

    const packCodes = Array.from(
      new Set([cardCode, ...duplicates, ...reprints, ...basePrints]),
    ).reduce((acc, code) => {
      const card = metadata.cards[code];

      const canShow =
        (showFanMadeRelations || official(card)) &&
        (showPreviews || !card.preview);

      if (!canShow) return acc;

      acc.set(card.pack_code, card);
      const reprintPacks = lookupTables.reprintPacksByPack[card.pack_code];

      if (card) {
        if (reprintPacks) {
          Object.keys(reprintPacks).forEach((reprintCode) => {
            const targetType = card.encounter_code ? "encounter" : "player";
            const reprintPack = metadata.packs[reprintCode];
            const reprintType = reprintPack.reprint?.type;
            if (reprintType === targetType) acc.set(reprintCode, card);
          });
        }
      }
      return acc;
    }, new Map<string, Card>());

    const printings = Array.from(packCodes.entries())
      .map(([packCode, card]) => {
        const pack = metadata.packs[packCode];
        const cycle = metadata.cycles[pack.cycle_code];
        return {
          card,
          cycle,
          id: `${pack.code}-${card.code}`,
          pack,
        } as Printing;
      })
      .sort((a, b) => {
        if (official(a.cycle) !== official(b.cycle)) {
          return a.cycle.official ? -1 : 1;
        }

        if (official(a.cycle) && official(b.cycle)) {
          if (a.cycle.position !== b.cycle.position) {
            return a.cycle.position - b.cycle.position;
          }
        } else {
          const cycleNameComparison = collator.compare(
            a.cycle.real_name,
            b.cycle.real_name,
          );

          if (cycleNameComparison !== 0) {
            return cycleNameComparison;
          }
        }

        if (a.cycle.code === "core" && b.cycle.code === "core") {
          return a.pack.position - b.pack.position;
        }

        // invert: mythos packs first, reprints second
        return b.pack.position - a.pack.position;
      });

    return printings;
  },
);
