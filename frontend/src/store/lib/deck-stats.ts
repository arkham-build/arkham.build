import type { Card, Deck, Slots } from "@arkham-build/shared";
import { countExperience } from "@arkham-build/shared";
import { isRewardCard } from "./filtering";

export function computeDeckStats(
  deck: Pick<Deck, "ignoreDeckLimitSlots" | "slots">,
  extraSlots: Slots | null | undefined,
  resolver: (code: string) => Card | undefined,
) {
  let xpRequired = 0;
  let deckSize = 0;
  let deckSizeTotal = 0;
  const myriadCounted: Record<string, boolean> = {};

  for (const [code, quantity] of Object.entries(deck.slots)) {
    const card = resolver(code);
    if (!card) continue;

    deckSizeTotal += quantity;

    xpRequired +=
      card.myriad && myriadCounted[card.real_name]
        ? 0
        : countExperience(card, quantity);

    if (card.myriad && !myriadCounted[card.real_name]) {
      myriadCounted[card.real_name] = true;
    }

    if (!isSpecialCard(card)) {
      deckSize += Math.max(
        quantity - (deck.ignoreDeckLimitSlots?.[code] ?? 0),
        0,
      );
    }
  }

  if (extraSlots) {
    for (const [code, quantity] of Object.entries(extraSlots)) {
      const card = resolver(code);
      if (!card) continue;

      xpRequired += countExperience(card, quantity);
      deckSizeTotal += quantity;
    }
  }

  return { xpRequired, deckSize, deckSizeTotal };
}

function isSpecialCard(card: Card): boolean {
  return (
    (!!card.encounter_code && !isRewardCard(card)) ||
    !!card.subtype_code ||
    card.permanent ||
    card.xp == null
  );
}
