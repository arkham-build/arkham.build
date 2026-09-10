import { createContext, useContext } from "react";
import type { ResolvedDeck } from "@/store/lib/types";
import { assert } from "@/utils/assert";

export interface DeckContextType {
  resolvedDeck: ResolvedDeck | undefined;
  canEdit?: boolean;
}

export const DeckContext = createContext<DeckContextType | undefined>(
  undefined,
);

const DEFAULT_DECK_CONTEXT: DeckContextType = {
  resolvedDeck: undefined,
  canEdit: false,
};

type DeckContextTypeChecked = {
  resolvedDeck: ResolvedDeck;
  canEdit?: boolean;
};

function isDeckContextTypeChecked(
  context: DeckContextType,
): context is DeckContextTypeChecked {
  return context.resolvedDeck !== undefined;
}

export function useResolvedDeck() {
  const context = useContext(DeckContext);
  return context ?? DEFAULT_DECK_CONTEXT;
}

export function useResolvedDeckChecked(): DeckContextTypeChecked {
  const context = useResolvedDeck();

  assert(
    isDeckContextTypeChecked(context),
    "expected to be defined in a parent DeckIdProvider",
  );

  return context;
}
