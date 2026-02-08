import type { Card } from "@arkham-build/shared";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import type { Metadata } from "../slices/metadata.types";
import type { LookupTables } from "./lookup-tables.types";

export type CardOwnershipOptions = {
  card: Card;
  metadata: Metadata;
  lookupTables: LookupTables;
  collection: Record<string, number | boolean>;
  showAllCards?: boolean;
  strict?: boolean;
};

export function ownedCardCount(options: CardOwnershipOptions) {
  const { card, metadata, lookupTables, collection, showAllCards, strict } =
    options;
  if (card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) {
    return card.quantity;
  }

  // Treat fan-made content as owned when not checking the pack filter.
  if (!card.official && !strict) return card.quantity;

  if (card.official && showAllCards) return card.quantity;

  let quantityOwned = 0;

  // direct pack ownership.
  const packOwnership = collection[card.pack_code];

  if (packOwnership) {
    const packsOwned = typeof packOwnership === "number" ? packOwnership : 1;
    quantityOwned += packsOwned * card.quantity;
  }

  const pack = metadata.packs[card.pack_code];

  // ownership of the format.
  const reprintId = `${pack.cycle_code}${card.encounter_code ? "c" : "p"}`;

  if (card.pack_code !== reprintId && collection[reprintId]) {
    quantityOwned += card.quantity;
  }

  const duplicates = lookupTables.relations.duplicates[card.code];

  // HACK: ownership of the revised core encounters.
  if (
    !duplicates &&
    pack.cycle_code === "core" &&
    collection["rcore"] &&
    card.encounter_code
  ) {
    quantityOwned += card.quantity;
  }

  if (!duplicates) return quantityOwned;

  for (const code of Object.keys(duplicates ?? {})) {
    const duplicate = metadata.cards[code];
    const packCode = duplicate.pack_code;
    if (packCode && collection[packCode]) quantityOwned += duplicate.quantity;
  }

  return quantityOwned;
}
