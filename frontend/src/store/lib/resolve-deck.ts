import type { Attachments, Card } from "@arkham-build/shared";
import { decodeExileSlots } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import type { Deck } from "../schemas/deck.schema";
import type { StoreState } from "../slices";
import { getAttachableCards } from "./attachments";
import {
  decodeAnnotations,
  decodeAttachments,
  decodeCardPool,
  decodeCustomizations,
  decodeDeckMeta,
  decodeSealedDeck,
  decodeSelections,
} from "./deck-meta";
import type { LookupTables } from "./lookup-tables.types";
import { resolveCardWithRelations } from "./resolve-card";
import { decodeExtraSlots, decodeSlots } from "./slots";
import type { CardWithRelations, DeckMeta, ResolvedDeck } from "./types";

/**
 * Given a decoded deck, resolve all cards and metadata for display.
 */
export function resolveDeck(
  deps: Pick<StoreState, "metadata" | "sharing"> & {
    lookupTables: LookupTables;
  },
  collator: Intl.Collator,
  deck: Deck,
): ResolvedDeck {
  const deckMeta = decodeDeckMeta(deck);
  const investigatorCode = deck.investigator_code;

  const investigator = resolveCardWithRelations(
    deps,
    collator,
    investigatorCode,
    deck.taboo_id,
    undefined,
    true,
  ) as CardWithRelations;

  if (!investigator) {
    throw new Error(
      `Investigator not found in store: ${deck.id} - ${deck.investigator_code}`,
    );
  }

  const investigatorFront = getInvestigatorForSide(
    deps,
    collator,
    deck.taboo_id,
    investigator,
    deckMeta,
    "alternate_front",
  );

  const investigatorBack = getInvestigatorForSide(
    deps,
    collator,
    deck.taboo_id,
    investigator,
    deckMeta,
    "alternate_back",
  );

  const hasExtraDeck = !!investigatorBack.card.side_deck_options;
  const hasParallel = !!investigator.relations?.parallel;
  const hasReplacements = !isEmpty(investigator.relations?.replacement);

  if (!investigatorFront || !investigatorBack) {
    throw new Error(`Investigator not found: ${deck.investigator_code}`);
  }

  const sealedDeck = decodeSealedDeck(deckMeta);

  const exileSlots = decodeExileSlots(deck.exile_string);

  const extraSlots = decodeExtraSlots(deckMeta);

  const customizations = decodeCustomizations(deckMeta, deps.metadata);

  const {
    bondedSlots,
    cards,
    deckSize,
    deckSizeTotal,
    fanMadeData,
    xpRequired,
    charts,
  } = decodeSlots(
    deps,
    collator,
    deck,
    extraSlots,
    investigator,
    customizations,
  );

  const availableAttachments = Object.entries(
    getAttachableCards(deck, deps.metadata),
  ).reduce<Attachments[]>((acc, [code, value]) => {
    if (investigatorBack.card.code === code || !!deck.slots[code]) {
      acc.push(value);
    }

    return acc;
  }, []);

  const cardPool = decodeCardPool(deck.slots, cards["slots"], deckMeta);

  const resolved = {
    ...deck,
    bondedSlots,
    annotations: decodeAnnotations(deckMeta),
    attachments: decodeAttachments(deckMeta),
    availableAttachments,
    cardPool,
    cards,
    customizations,
    extraSlots,
    exileSlots: exileSlots,
    fanMadeData,
    investigatorBack,
    investigatorFront,
    metaParsed: deckMeta,
    hasExtraDeck,
    hasParallel,
    hasReplacements,
    originalDeck: deck,
    sealedDeck,
    selections: decodeSelections(investigatorBack, deckMeta),
    sideSlots: Array.isArray(deck.sideSlots) ? {} : deck.sideSlots,
    shared: !!deps.sharing.decks[deck.id],
    stats: {
      deckSize,
      deckSizeTotal,
      xpRequired: xpRequired,
      charts,
    },
    tabooSet: deck.taboo_id
      ? deps.metadata.tabooSets[deck.taboo_id]
      : undefined,
  } as ResolvedDeck;

  return resolved as ResolvedDeck;
}

function getInvestigatorForSide(
  deps: Pick<StoreState, "metadata"> & {
    lookupTables: LookupTables;
  },
  collator: Intl.Collator,
  tabooId: number | undefined | null,
  investigator: CardWithRelations,
  deckMeta: DeckMeta,
  key: "alternate_front" | "alternate_back",
) {
  if (deckMeta.transform_into) {
    return resolveCardWithRelations(
      deps,
      collator,
      deckMeta.transform_into,
      tabooId,
      undefined,
      true,
    ) as CardWithRelations;
  }

  const val = deckMeta[key];

  const hasAlternate = val && val !== investigator.card.code;
  if (!hasAlternate) return investigator;

  if (investigator.relations?.parallel?.card.code === val) {
    return investigator.relations?.parallel;
  }

  return investigator;
}

export function getDeckLimitOverride(
  lookupTables: LookupTables,
  deck: ResolvedDeck | undefined,
  card: Card,
): number | undefined {
  const code = card.code;
  const deckLimit = card.deck_limit ?? Number.MAX_SAFE_INTEGER;

  const sealed = deck?.sealedDeck?.cards;
  if (!sealed) return undefined;

  if (card.xp == null && code !== SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) {
    return deckLimit;
  }

  if (sealed[code] != null) {
    return Math.min(sealed[code], deckLimit);
  }

  const duplicates = lookupTables.relations.duplicates[code];
  if (!duplicates) return undefined;

  for (const duplicateCode of Object.keys(duplicates)) {
    if (sealed[duplicateCode] != null) {
      return Math.min(sealed[duplicateCode], deckLimit);
    }
  }

  return undefined;
}

export function deckTags(deck: ResolvedDeck, delimiter = " ") {
  return (
    deck.tags
      ?.trim()
      .split(delimiter)
      .filter((x) => x) ?? []
  );
}
