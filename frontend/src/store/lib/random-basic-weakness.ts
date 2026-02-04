import { cardLimit } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { resolveLimitedPoolPacks } from "@/utils/environments";
import { isEmpty } from "@/utils/is-empty";
import { randomInt } from "@/utils/random-int";
import type { Metadata } from "../slices/metadata.types";
import type { SettingsState } from "../slices/settings.types";
import { ownedCardCount } from "./card-ownership";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

export function randomBasicWeaknessForDeck(
  metadata: Metadata,
  lookupTables: LookupTables,
  settings: SettingsState,
  deck: ResolvedDeck,
) {
  const factionCode = deck.investigatorBack.card.faction_code;

  const limitedPool = resolveLimitedPoolPacks(
    metadata,
    deck.cardPool ?? [],
  ).map((p) => p.code);

  const useLimitedPool =
    settings.useLimitedPoolForWeaknessDraw && !isEmpty(limitedPool);

  const collection = useLimitedPool
    ? limitedPool.reduce<Record<string, number>>((acc, curr) => {
        acc[curr] = settings.collection?.[curr] ?? 1;
        return acc;
      }, {})
    : settings.collection;

  const basicWeaknesses = Object.keys(
    lookupTables.subtypeCode["basicweakness"],
  ).reduce<string[]>((acc, code) => {
    const card = metadata.cards[code];

    const ownedCount = ownedCardCount({
      card,
      metadata,
      lookupTables,
      collection,
      showAllCards: !useLimitedPool && settings.showAllCards,
      strict:
        useLimitedPool || settings.cardListsDefaultContentType === "official",
    });

    if (
      card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS ||
      !!card.duplicate_of_code ||
      ownedCount === 0 ||
      deck.slots[code] >= cardLimit(card)
    ) {
      return acc;
    }

    if (
      card.restrictions?.faction &&
      !card.restrictions.faction.includes(factionCode)
    ) {
      return acc;
    }

    const codes = Array.from({ length: ownedCount }, () => code);
    acc.push(...codes);

    return acc;
  }, []);

  if (!basicWeaknesses.length) return undefined;

  const randomIndex = randomInt(0, basicWeaknesses.length - 1);
  return basicWeaknesses[randomIndex];
}
