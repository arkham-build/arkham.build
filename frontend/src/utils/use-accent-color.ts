import type { Card } from "@arkham-build/shared";

export function useAccentColor(card?: Card) {
  const cssVariables = card ? getAccentColorsForFaction(card) : {};

  return cssVariables;
}

export function getAccentColorsForFaction(card: Card): React.CSSProperties {
  let accent: string;

  if (card.faction2_code) {
    accent = "multiclass";
  } else if (card.faction_code === "neutral") {
    accent = "neutral";
  } else {
    accent = card.faction_code;
  }

  return {
    "--accent-color": `var(--color-${accent})`,
    "--accent-color-dark": `var(--${accent}-dark)`,
    "--accent-color-contrast": "var(--color-inverted)",
  } as React.CSSProperties;
}
