import type {
  AllCardResponse,
  DataVersionResponse,
  MetadataResponse,
} from "@/store/services/queries";
import type { Deck, Id } from "./data.types";
import type { Locale } from "./settings.types";

export type AppState = {
  clientId: string;
  bannersDismissed?: string[];
};

export type AppSlice = {
  app: AppState;

  init(
    queryMetadata: (locale?: Locale) => Promise<MetadataResponse>,
    queryDataVersion: (locale?: Locale) => Promise<DataVersionResponse>,
    queryCards: (locale?: Locale) => Promise<AllCardResponse>,
    refresh?: boolean,
    locale?: Locale,
  ): Promise<boolean>;

  createDeck(): Promise<Id>;

  saveDeck(deckId: Id): Promise<Id>;

  upgradeDeck(payload: {
    id: Id;
    xp: number;
    exileString: string;
    usurped?: boolean;
  }): Promise<Deck>;

  deleteDeck(id: Id, callback?: () => void): Promise<void>;
  deleteAllDecks(): Promise<void>;
  deleteUpgrade(id: Id, callback?: (id: Id) => void): Promise<Id>;

  backup(): void;
  restore(file: File): Promise<void>;

  dismissBanner(bannerId: string): void;

  dehydrate(partial: "all" | "app" | "metadata"): Promise<void>;

  hydrate(): Promise<void>;
};
