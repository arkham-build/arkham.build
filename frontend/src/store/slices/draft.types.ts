import type { SealedDeckResponse } from "@arkham-build/shared";
import type { StorageProvider } from "@/utils/constants";

export type DraftPhase = "setup" | "picking" | "complete";

export type CustomizationUpgradeOption = {
  type: "customization";
  cardCode: string; // The customizable card's code
  optionIndex: number; // Which customization row (0-indexed)
  xpCost: number; // XP cost for this row
};

export type RegularCardOption = {
  type: "card";
  code: string;
};

export type DraftOption = RegularCardOption | CustomizationUpgradeOption;

export type DraftCardSet = "requiredCards" | "advanced" | "replacement";

export type DraftState = {
  phase: DraftPhase;
  investigatorCode: string;
  investigatorFrontCode: string;
  investigatorBackCode: string;
  cardsPerPick: number;
  pickedCards: Record<string, number>;
  signatureCards: Record<string, number>;
  currentOptions: DraftOption[];
  targetDeckSize: number;
  tabooSetId: number | undefined;
  provider: StorageProvider;
  title: string;
  selections: {
    [key: string]: string;
  };
  sets: DraftCardSet[];
  cardPool?: string[] | null; // undefined = use default environment, null = explicitly cleared (no filter), array = manually selected packs
  sealed?: SealedDeckResponse;
  mode: "new" | "upgrade";
  upgradeDeckId?: string;
  remainingXp: number;
  totalXp: number;
  previousRemainingXp?: number; // Remaining XP from the deck being upgraded (for card pool filtering)
  exileString?: string;
  customizationUpgrades?: Record<string, Record<number, number>>; // cardCode -> optionIndex -> xp_spent
  skipsAllowed: number;
  skipsUsed: number;
  researchedCards: string[]; // Array of level 0 card codes that have been researched
};

export type DraftSlice = {
  draft: DraftState | undefined;

  initDraft: (
    investigatorCode: string,
    initialInvestigatorChoice?: string,
  ) => void;
  initUpgradeDraft: (
    deckId: string,
    newXp: number,
    cardsPerPick: number,
    previousRemainingXp?: number,
    totalAvailableXp?: number,
  ) => void;
  draftSetTitle: (value: string) => void;
  draftSetTabooSet: (value: number | undefined) => void;
  draftSetProvider: (value: StorageProvider) => void;
  draftSetInvestigatorCode: (value: string, side?: "front" | "back") => void;
  draftSetSelection: (key: string, value: string) => void;
  draftSetCardPool: (value: string[]) => void;
  draftSetSealed: (payload: SealedDeckResponse | undefined) => void;
  draftSetCardsPerPick: (value: number) => void;
  draftSetSkipsAllowed: (value: number) => void;
  draftSetResearchedCards: (cards: string[]) => void;
  draftToggleCardSet: (value: string) => void;
  generateDraftOptions: () => void;
  pickDraftCard: (code: string, quantity?: number) => void;
  pickDraftCustomization: (cardCode: string, optionIndex: number) => void;
  skipDraftStep: () => void;
  resetDraft: () => void;
  startDraft: () => void;
};
