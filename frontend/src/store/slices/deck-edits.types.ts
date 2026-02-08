import type { Card, DeckOptionSelectType } from "@arkham-build/shared";
import type { Annotations, DeckMeta, ResolvedDeck } from "../lib/types";
import type { Id } from "../schemas/deck.schema";
import type { AvailableUpgrades } from "../selectors/lists";

export type Slot =
  | "slots"
  | "sideSlots"
  | "extraSlots"
  | "ignoreDeckLimitSlots";

export function mapTabToSlot(tab: string): Slot {
  switch (tab) {
    case "extraSlots":
      return "extraSlots";
    case "sideSlots":
      return "sideSlots";
    case "ignoreDeckLimitSlots":
      return "ignoreDeckLimitSlots";
    default:
      return "slots";
  }
}

export type CustomizationEdit = {
  xp_spent?: number;
  selections?: string[];
};

export type AttachmentQuantities = {
  [code: string]: {
    [code: string]: number;
  };
};

export type EditState = {
  customizations?: {
    [code: string]: {
      [id: number]: CustomizationEdit;
    };
  };
  description_md?: string | null;
  investigatorCode?: string;
  investigatorBack?: string | null;
  investigatorFront?: string | null;
  meta?: DeckMeta;
  name?: string | null;
  quantities?: {
    extraSlots?: Record<string, number>;
    ignoreDeckLimitSlots?: Record<string, number>;
    sideSlots?: Record<string, number>;
    slots?: Record<string, number>;
  };
  attachments?: AttachmentQuantities;
  annotations?: Annotations;
  tabooId?: number | null;
  tags?: string | null;
  xpAdjustment?: number | null;
  /** The type of an edit determines whether a notification is shown on load. */
  type?: "system" | "user";
};

type EditsState = {
  [id: Id]: EditState;
};

export type DeckEditsSlice = {
  deckEdits: EditsState;

  createEdit(deckId: Id, edit: Partial<EditState>): void;

  discardEdits(deckId: Id): void;

  swapDeck(card: Card, deckId: Id, targetDeck: "slots" | "sideSlots"): void;

  drawRandomBasicWeakness(deckId: Id): Card;

  completeTask(deckId: Id, card: Card): string;

  updateCardQuantity(
    deckId: Id,
    code: string,
    quantity: number,
    limit: number,
    slot?: Slot,
    mode?: "increment" | "set",
  ): void;

  updateTabooId(deckId: Id, value: number | null): void;

  updateInvestigatorSide(deckId: Id, side: string, code: string): void;

  updateInvestigatorCode(deckId: Id, code: string): void;

  updateCustomization(
    deckId: Id,
    code: string,
    index: number,
    edit: CustomizationEdit,
  ): void;

  updateMetaProperty(
    deckId: Id,
    key: string,
    value: string | null,
    type?: DeckOptionSelectType,
  ): void;

  updateName(deckId: Id, value: string): void;

  updateDescription(deckId: Id, value: string): void;

  updateTags(deckId: Id, value: string): void;

  updateXpAdjustment(deckId: Id, value: number): void;

  updateAttachment(payload: {
    deck: ResolvedDeck;
    targetCode: string;
    code: string;
    quantity: number;
    limit: number;
  }): void;

  updateAnnotation(deckId: Id, code: string, value: string | null): void;

  upgradeCard(payload: UpgradePayload): void;

  applyShrewdAnalysis(payload: {
    availableUpgrades: AvailableUpgrades;
    deckId: Id;
    code: string;
    slots: "slots" | "extraSlots";
  }): void;
};

export type UpgradePayload = {
  availableUpgrades: AvailableUpgrades;
  code: string;
  deckId: Id;
  delta: number;
  slots: "slots" | "extraSlots";
  upgradeCode: string;
};
