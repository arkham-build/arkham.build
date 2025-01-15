import { decodeExileSlots } from "@/utils/card-utils";
import {
  ALT_ART_INVESTIGATOR_MAP,
  ATTACHABLE_CARDS,
  type AttachableDefinition,
} from "@/utils/constants";
import type { Deck } from "../slices/data.types";
import type { LookupTables } from "../slices/lookup-tables.types";
import type { Metadata } from "../slices/metadata.types";
import type { SharingState } from "../slices/sharing.types";
import {
  decodeAnnotations,
  decodeAttachments,
  decodeCardPool,
  decodeCustomizations,
  decodeDeckMeta,
  decodeSealedDeck,
  decodeSelections,
} from "./deck-meta";
import { resolveCardWithRelations } from "./resolve-card";
import { decodeExtraSlots, decodeSlots } from "./slots";
import type { CardWithRelations, DeckMeta, ResolvedDeck } from "./types";

/**
 * Given a decoded deck, resolve all cards and metadata for display.
 */
export function resolveDeck(
  metadata: Metadata,
  lookupTables: LookupTables,
  sharing: SharingState,
  deck: Deck,
): ResolvedDeck {
  const deckMeta = decodeDeckMeta(deck);
  // some decks on arkhamdb are created for the replacement investigator, normalize.
  const investigatorCode =
    deck.investigator_code in ALT_ART_INVESTIGATOR_MAP
      ? ALT_ART_INVESTIGATOR_MAP[
          deck.investigator_code as keyof typeof ALT_ART_INVESTIGATOR_MAP
        ]
      : deck.investigator_code;

  const investigator = resolveCardWithRelations(
    metadata,
    lookupTables,
    investigatorCode,
    deck.taboo_id,
    undefined,
    true,
  ) as CardWithRelations;

  if (!investigator) {
    throw new Error(
      `Investigator not found in store: ${deck.investigator_code}`,
    );
  }

  const investigatorFront = getInvestigatorForSide(
    metadata,
    lookupTables,
    deck.taboo_id,
    investigator,
    deckMeta,
    "alternate_front",
  );

  const investigatorBack = getInvestigatorForSide(
    metadata,
    lookupTables,
    deck.taboo_id,
    investigator,
    deckMeta,
    "alternate_back",
  );

  const hasExtraDeck = !!investigatorBack.card.side_deck_options;
  const hasParallel = !!investigator.relations?.parallel;
  const hasReplacements = !!investigator.relations?.replacement?.length;

  if (!investigatorFront || !investigatorBack) {
    throw new Error(`Investigator not found: ${deck.investigator_code}`);
  }

  const cardPool = decodeCardPool(deckMeta);

  const sealedDeck = decodeSealedDeck(deckMeta);

  const exileSlots = decodeExileSlots(deck.exile_string);

  const extraSlots = decodeExtraSlots(deckMeta);

  const customizations = decodeCustomizations(deckMeta, metadata);

  const { bondedSlots, cards, deckSize, deckSizeTotal, xpRequired, charts } =
    decodeSlots(
      deck,
      extraSlots,
      metadata,
      lookupTables,
      investigator,
      customizations,
    );

  const availableAttachments = Object.entries(ATTACHABLE_CARDS).reduce<
    AttachableDefinition[]
  >((acc, [code, value]) => {
    if (investigatorBack.card.code === code || !!deck.slots[code]) {
      acc.push(value);
    }

    return acc;
  }, []);

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
    shared: !!sharing.decks[deck.id],
    stats: {
      deckSize,
      deckSizeTotal,
      xpRequired: xpRequired,
      charts,
    },
    tabooSet: deck.taboo_id ? metadata.tabooSets[deck.taboo_id] : undefined,
  } as ResolvedDeck;

  return resolved as ResolvedDeck;
}

function getInvestigatorForSide(
  metadata: Metadata,
  lookupTables: LookupTables,
  tabooId: number | undefined | null,
  investigator: CardWithRelations,
  deckMeta: DeckMeta,
  key: "alternate_front" | "alternate_back",
) {
  if (deckMeta.transform_into) {
    return resolveCardWithRelations(
      metadata,
      lookupTables,
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
  deck: ResolvedDeck | undefined,
  code: string,
): number | undefined {
  return deck?.sealedDeck?.cards[code];
}

export function deckTags(deck: ResolvedDeck) {
  return (
    deck.tags
      ?.trim()
      .split(" ")
      .filter((x) => x) ?? []
  );
}

export function extendedDeckTags(deck: ResolvedDeck, includeCardPool = false) {
  const tags = [];

  if (deck.source === "arkhamdb") {
    tags.push("arkhamdb");
  } else if (deck.shared) {
    tags.push("shared");
  } else {
    tags.push("private");
  }

  if (includeCardPool) {
    if (deck.metaParsed.card_pool) {
      tags.push("limited pool");
    }

    if (deck.metaParsed.sealed_deck) {
      tags.push("sealed");
    }
  }
  tags.push(...deckTags(deck));
  return tags;
}
