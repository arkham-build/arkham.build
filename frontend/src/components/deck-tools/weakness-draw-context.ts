import type { Card } from "@arkham-build/shared";
import { createContext, useContext } from "react";
import { assert } from "@/utils/assert";

export const WeaknessDrawContext = createContext<
  { drawWeakness: (draw: () => Card) => void } | undefined
>(undefined);

export function useWeaknessDraw() {
  const context = useContext(WeaknessDrawContext);
  assert(context, "Weakness draws must be inside WeaknessDrawProvider.");
  return context;
}
