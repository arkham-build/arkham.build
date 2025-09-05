import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StoreState } from "./slices";
import { createAppSlice } from "./slices/app";
import { createConnectionsSlice } from "./slices/connections";
import { createDataSlice } from "./slices/data";
import { createDeckCollectionSlice } from "./slices/deck-collection";
import { createDeckCreateSlice } from "./slices/deck-create";
import { createDeckEditsSlice } from "./slices/deck-edits";
import { createFanMadeDataSlice } from "./slices/fan-made-data";
import { createListsSlice } from "./slices/lists";
import { createMetadataSlice } from "./slices/metadata";
import { createRecommenderSlice } from "./slices/recommender";
import { createRemotingSlice } from "./slices/remoting";
import { createSettingsSlice } from "./slices/settings";
import { createSharingSlice } from "./slices/sharing";
import { createUISlice } from "./slices/ui";

// biome-ignore lint/suspicious/noExplicitAny: safe.
const stateCreator = (...args: [any, any, any]) => ({
  ...createAppSlice(...args),
  ...createDataSlice(...args),
  ...createFanMadeDataSlice(...args),
  ...createMetadataSlice(...args),
  ...createListsSlice(...args),
  ...createSettingsSlice(...args),
  ...createUISlice(...args),
  ...createDeckEditsSlice(...args),
  ...createDeckCreateSlice(...args),
  ...createSharingSlice(...args),
  ...createDeckCollectionSlice(...args),
  ...createConnectionsSlice(...args),
  ...createRemotingSlice(...args),
  ...createRecommenderSlice(...args),
});

export const useStore = create<StoreState>()(
  import.meta.env.MODE === "test" ? stateCreator : devtools(stateCreator),
);
