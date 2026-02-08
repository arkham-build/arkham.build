import type { Card, SealedDeckResponse } from "@arkham-build/shared";

export type CardSet = "requiredCards" | "advanced" | "replacement";

type DeckCreateState = {
  title: string;
  tabooSetId: number | undefined;
  investigatorCode: string;
  investigatorFrontCode: string;
  investigatorBackCode: string;
  extraCardQuantities: Record<string, number>;
  provider: string;
  sets: CardSet[];
  selections: {
    [key: string]: string;
  };
  cardPool?: string[];
  sealed?: SealedDeckResponse;
};

export type DeckCreateSlice = {
  deckCreate: DeckCreateState | undefined;

  initCreate: (code: string, initialInvestigatorChoice?: string) => void;
  resetCreate: () => void;

  deckCreateChangeExtraCardQuantity: (card: Card, quantity: number) => void;

  deckCreateSetProvider(provider: string): void;
  deckCreateSetSelection(key: string, value: string): void;
  deckCreateSetTabooSet: (value: number | undefined) => void;
  deckCreateSetTitle: (value: string) => void;
  deckCreateToggleCardSet: (value: string) => void;
  deckCreateSetInvestigatorCode: (
    value: string,
    side?: "front" | "back",
  ) => void;
  deckCreateSetCardPool: (value: string[]) => void;
  deckCreateSetSealed: (payload: SealedDeckResponse | undefined) => void;
};
