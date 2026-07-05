import type { AppSlice } from "./app.types";
import type { AuthSlice } from "./auth.types";
import type { CardTagsSlice } from "./card-tags.types";
import type { DataSlice } from "./data.types";
import type { DeckCollectionSlice } from "./deck-collection.types";
import type { DeckCreateSlice } from "./deck-create.types";
import type { DeckEditsSlice } from "./deck-edits.types";
import type { FanMadeDataSlice } from "./fan-made-data.types";
import type { ListsSlice } from "./lists.types";
import type { MetadataSlice } from "./metadata.types";
import type { RecommenderSlice } from "./recommender.types";
import type { SettingsSlice } from "./settings";
import type { SyncSlice } from "./sync.types";
import type { UISlice } from "./ui.types";

export type StoreState = AppSlice &
  AuthSlice &
  MetadataSlice &
  ListsSlice &
  UISlice &
  SettingsSlice &
  SyncSlice &
  DataSlice &
  CardTagsSlice &
  FanMadeDataSlice &
  DeckEditsSlice &
  DeckCreateSlice &
  DeckCollectionSlice &
  RecommenderSlice;
