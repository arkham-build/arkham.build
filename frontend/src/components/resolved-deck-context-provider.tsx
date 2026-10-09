import { DeckContext, type DeckContextType } from "./resolved-deck-context";

interface Props extends DeckContextType {
  children: React.ReactNode;
}

export function ResolvedDeckProvider(props: Props) {
  const { resolvedDeck, canEdit, children } = props;

  const value = {
    resolvedDeck,
    canEdit,
  };

  return <DeckContext value={value}>{children}</DeckContext>;
}
