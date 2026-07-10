import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StoreState } from "./slices";
import { createAppSlice } from "./slices/app";
import { createAuthSlice } from "./slices/auth";
import { createCardTagsSlice } from "./slices/card-tags";
import { createDataSlice } from "./slices/data";
import { createDeckCollectionSlice } from "./slices/deck-collection";
import { createDeckCreateSlice } from "./slices/deck-create";
import { createDeckEditsSlice } from "./slices/deck-edits";
import { createFanMadeDataSlice } from "./slices/fan-made-data";
import { createListsSlice } from "./slices/lists";
import { createMetadataSlice } from "./slices/metadata";
import { createRecommenderSlice } from "./slices/recommender";
import { createSettingsSlice } from "./slices/settings";
import { createSyncSlice } from "./slices/sync";
import { createUISlice } from "./slices/ui";

// oxlint-disable-next-line typescript/no-explicit-any -- safe.
const stateCreator = (...args: [any, any, any]) => ({
  ...createAppSlice(...args),
  ...createAuthSlice(...args),
  ...createDataSlice(...args),
  ...createCardTagsSlice(...args),
  ...createFanMadeDataSlice(...args),
  ...createMetadataSlice(...args),
  ...createListsSlice(...args),
  ...createSettingsSlice(...args),
  ...createSyncSlice(...args),
  ...createUISlice(...args),
  ...createDeckEditsSlice(...args),
  ...createDeckCreateSlice(...args),
  ...createDeckCollectionSlice(...args),
  ...createRecommenderSlice(...args),
});

export const useStore = create<StoreState>()(
  import.meta.env.MODE === "test" ? stateCreator : devtools(stateCreator),
);
