import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { ResolvedDeck } from "@/store/lib/types";
import { assert } from "./assert";

interface DeckContextType {
  resolvedDeck: ResolvedDeck | undefined;
  canEdit?: boolean;
}

type DeckContextTypeChecked = {
  resolvedDeck: ResolvedDeck;
  canEdit?: boolean;
};

function isDeckContextTypeChecked(
  context: DeckContextType,
): context is DeckContextTypeChecked {
  return context.resolvedDeck !== undefined;
}

const DeckIdContext = createContext<DeckContextType | undefined>(undefined);

interface Props extends DeckContextType {
  children: React.ReactNode;
}

export function ResolvedDeckProvider(props: Props) {
  const { resolvedDeck, canEdit, children } = props;

  const value = useMemo(
    () => ({
      resolvedDeck,
      canEdit,
    }),
    [resolvedDeck, canEdit],
  );

  return (
    <DeckIdContext.Provider value={value}>{children}</DeckIdContext.Provider>
  );
}

const DEFAULT_DECK_CONTEXT: DeckContextType = {
  resolvedDeck: undefined,
  canEdit: false,
};

export function useResolvedDeck() {
  const context = useContext(DeckIdContext);
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
