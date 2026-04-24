import { useMemo } from "react";
import { DeckContext, type DeckContextType } from "./resolved-deck-context";

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

  return <DeckContext value={value}>{children}</DeckContext>;
}
