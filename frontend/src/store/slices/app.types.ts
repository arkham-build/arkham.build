import type { Deck, Id } from "@/store/schemas/deck.schema";
import type {
  AllCardResponse,
  DataVersionResponse,
  MetadataResponse,
} from "@/store/services/queries";
import type { StoreState } from ".";
import type { Locale } from "./settings.types";

type AppState = {
  clientId: string;
  bannersDismissed?: string[];
};

export type AppSlice = {
  app: AppState;

  init(
    queryMetadata: (locale?: Locale) => Promise<MetadataResponse>,
    queryDataVersion: (locale?: Locale) => Promise<DataVersionResponse>,
    queryCards: (locale?: Locale) => Promise<AllCardResponse>,
    opts?: {
      locale?: Locale;
      overrides?: Partial<StoreState>;
      refresh?: boolean;
    },
  ): Promise<boolean>;

  createDeck(): Promise<Id>;

  saveDeck(deckId: Id): Promise<Id>;

  updateDeckProperties(deckId: Id, properties: Partial<Deck>): Promise<Deck>;

  upgradeDeck(payload: {
    id: Id;
    xp: number;
    exileString: string;
    usurped?: boolean;
  }): Promise<Deck>;

  deleteAllDecks(): Promise<void>;
  deleteDeck(id: Id, callback?: () => void): Promise<void>;
  deleteUpgrade(id: Id, callback?: (id: Id) => void): Promise<Id>;

  backup(): void;
  restore(file: File): Promise<void>;

  dismissBanner(bannerId: string): Promise<void>;
};
