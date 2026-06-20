import { SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { assert } from "@/utils/assert";
import { formatRelationTitle } from "@/utils/formatting";
import i18n from "@/utils/i18n";
import { resolveCardWithRelations } from "../lib/resolve-card";
import { hasHealthyArkhamDBIdentity } from "../lib/sync";
import type { CardSet, CardWithRelations, ResolvedCard } from "../lib/types";
import type { StoreState } from "../slices";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "./shared";

export function selectDeckCreateChecked(state: StoreState) {
  const { deckCreate } = state;
  assert(deckCreate, "DeckCreate slice must be initialized.");
  return deckCreate;
}

export const selectDeckCreateInvestigators = createSelector(
  selectDeckCreateChecked,
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (deckCreate, metadata, lookupTables, collator) => {
    return Object.entries({
      investigator: deckCreate.investigatorCode,
      back: deckCreate.investigatorBackCode,
      front: deckCreate.investigatorFrontCode,
    }).reduce(
      (acc, [key, code]) => {
        const card = resolveCardWithRelations(
          { metadata, lookupTables },
          collator,
          code,
          deckCreate.tabooSetId,
          undefined,
          true,
        );

        assert(card, `${key} card must be resolved.`);

        acc[key] = card;
        return acc;
      },
      {} as Record<string, CardWithRelations>,
    );
  },
);

export const selectDeckCreateStorageProviderOptions = createSelector(
  (state: StoreState) => state.auth,
  (state: StoreState) => state.settings.locale,
  (auth) => {
    const providers: string[] = ["local", "account", "arkhamdb"];

    return providers
      .filter((provider) => {
        switch (provider) {
          case "local":
            return true;
          case "account":
            return auth.status === "authenticated";
          case "arkhamdb":
            return hasHealthyArkhamDBIdentity(auth);
          default:
            return false;
        }
      })
      .map((provider) => ({
        label: i18n.t(`deck_edit.config.storage_provider.${provider}`),
        value: provider,
      }));
  },
);

export const selectDeckCreateCardSets = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  selectDeckCreateChecked,
  selectDeckCreateInvestigators,
  (metadata, lookupTables, collator, deckCreate, investigators) => {
    const groupings: CardSet[] = [];

    const { back, investigator } = investigators;
    const { relations } = back;

    const deckSizeRequirement = investigator.card.deck_requirements?.size ?? 30;

    const hasDeckSizeOption = investigator.card.deck_options?.find((o) =>
      Array.isArray(o.deck_size_select),
    );

    if (relations?.advanced?.length) {
      groupings.push({
        id: "advanced",
        title: formatRelationTitle("advanced"),
        canSelect: true,
        cards: relations.advanced,
        selected: deckCreate.sets.includes("advanced"),
        quantities: relations.advanced.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
        help: i18n.t("deck_create.help_advanced"),
      });
    }

    if (relations?.replacement?.length) {
      groupings.push({
        id: "replacement",
        title: formatRelationTitle("replacement"),
        canSelect: true,
        cards: relations.replacement,
        selected: deckCreate.sets.includes("replacement"),
        quantities: relations.replacement.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
        help: i18n.t("deck_create.help_replacements"),
      });
    }

    const showParallelCards =
      deckCreate.investigatorFrontCode === SPECIAL_CARD_CODES.PARALLEL_ROLAND ||
      deckCreate.investigatorFrontCode === SPECIAL_CARD_CODES.PARALLEL_WENDY ||
      deckCreate.investigatorBackCode === SPECIAL_CARD_CODES.PARALLEL_JIM;

    if (showParallelCards && relations?.parallelCards?.length) {
      groupings.push({
        id: "extra",
        title: formatRelationTitle("extra"),
        cards: relations.parallelCards,
        canSetQuantity:
          deckCreate.investigatorFrontCode ===
          SPECIAL_CARD_CODES.PARALLEL_ROLAND,
        canSelect: false,
        selected: showParallelCards,
        quantities: relations.parallelCards.reduce(
          (acc, { card }) => {
            acc[card.code] =
              deckCreate.extraCardQuantities[card.code] ?? card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });
    }

    if (relations?.sideDeckRequiredCards?.length) {
      groupings.push({
        id: "sideDeckRequiredCards",
        title: formatRelationTitle("sideDeckRequiredCards"),
        canSelect: false,
        selected: true,
        cards: relations.sideDeckRequiredCards,
        quantities: relations.sideDeckRequiredCards.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });
    }

    if (relations?.bound?.length) {
      groupings.push({
        id: "bound",
        title: formatRelationTitle("bound"),
        canSelect: false,
        selected: false,
        cards: relations.bound,
        quantities: relations.bound.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });
    }

    if (relations?.requiredCards) {
      groupings.unshift({
        id: "requiredCards",
        canSelect: groupings.length > 0,
        cards: relations.requiredCards,
        title: formatRelationTitle("requiredCards"),
        selected: deckCreate.sets.includes("requiredCards"),
        quantities: relations.requiredCards.reduce(
          (acc, { card }) => {
            let quantity = card.quantity;

            if (card.code === SPECIAL_CARD_CODES.OCCULT_EVIDENCE) {
              const deckSizeSelection =
                deckCreate.selections.deck_size_selected;

              const deckSize = hasDeckSizeOption
                ? deckSizeSelection
                  ? +deckSizeSelection
                  : deckSizeRequirement
                : deckSizeRequirement;

              quantity = (deckSize - 20) / 10;
            }

            acc[card.code] = quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });
    }

    groupings.unshift({
      id: "random_basic_weakness",
      title: i18n.t("deck_create.random_basic_weakness"),
      canSelect: false,
      selected: true,
      cards: [
        resolveCardWithRelations(
          { metadata, lookupTables },
          collator,
          SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
          undefined,
        ) as ResolvedCard,
      ],
      quantities: {
        [SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS]:
          back.card.deck_requirements?.random?.length ?? 1,
      },
    });

    return groupings;
  },
);
