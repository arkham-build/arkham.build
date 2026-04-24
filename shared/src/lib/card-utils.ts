import type { Card } from "../schemas/card.schema.ts";

export function countExperience(card: Card, quantity: number) {
  if (card.customization_xp) return card.customization_xp;

  let xp = card.xp ?? 0;
  if (card.exceptional) xp *= 2;
  if (card.taboo_xp) xp += card.taboo_xp;

  return xp * (card.myriad ? Math.min(quantity, 1) : quantity);
}

export function cardLevel(card: Card) {
  return card.customization_xp
    ? Math.round(card.customization_xp / 2)
    : card.xp;
}

/**
 * Get the "real" card level after applying taboo.
 * For the sake of deckbuilding, cards keep their original level + an xp change.
 * However, for the sake of XP calculations and interactions such as "Adaptable",
 * cards should be considered their updated level in the spirit of the taboo.
 * This prevents weirdness such as Adaptable being able to swap in Drawing Thin for free.
 */
export function realCardLevel(card: Card) {
  const level = cardLevel(card);
  if (level == null) return level;
  return level + (card.taboo_xp ?? 0);
}
