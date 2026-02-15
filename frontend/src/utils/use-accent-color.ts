import type { Card } from "@arkham-build/shared";
import { useMemo } from "react";

export function useAccentColor(card?: Card) {
  const cssVariables = useMemo(
    () => (card ? getAccentColorsForFaction(card) : {}),
    [card],
  );

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
    "--acent-color-contrast": "var(--palette-6)",
  } as React.CSSProperties;
}
