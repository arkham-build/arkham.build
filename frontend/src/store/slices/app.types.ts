import type { Deck, Id, StorageProvider } from "@arkham-build/shared";
import type { DeckDisplayType } from "@/components/deck-display/deck-display";
import type { ResolvedDeck } from "@/store/lib/types";
import type { HttpClient } from "@/store/services/http-client";
import type {
  AllCardResponse,
  DataVersionResponse,
  MetadataResponse,
} from "@/store/services/requests/cache";
import type { StoreState } from ".";

type AppState = {
  clientId: string;
  bannersDismissed?: string[];
};

export type DeckUpgradePayload = {
  id: Id;
  xp: number;
  exileString: string;
  usurped?: boolean;
};

export type AppSlice = {
  app: AppState;

  init(
    queryMetadata: (locale?: string) => Promise<MetadataResponse>,
    queryDataVersion: (locale?: string) => Promise<DataVersionResponse>,
    queryCards: (locale?: string) => Promise<AllCardResponse>,
    opts?: {
      locale?: string;
      overrides?: Partial<StoreState>;
      refresh?: boolean;
    },
  ): Promise<boolean>;

  createDeck(client: HttpClient): Promise<Id>;

  importSharedDeck(deck: ResolvedDeck, type: DeckDisplayType): Promise<Id>;

  saveDeck(client: HttpClient, deckId: Id): Promise<Id>;

  uploadDeckToProvider(
    client: HttpClient,
    deckId: Id,
    provider: StorageProvider,
  ): Promise<Id>;

  updateDeckProperties(
    client: HttpClient,
    deckId: Id,
    properties: Partial<Deck>,
  ): Promise<Deck>;

  upgradeDeck(client: HttpClient, payload: DeckUpgradePayload): Promise<Deck>;

  deleteAllDecks(): Promise<void>;
  deleteDeck(client: HttpClient, id: Id, callback?: () => void): Promise<void>;
  deleteUpgrade(
    client: HttpClient,
    id: Id,
    callback?: (id: Id) => void,
  ): Promise<Id>;

  backup(): void;

  dismissBanner(bannerId: string): Promise<void>;
};
