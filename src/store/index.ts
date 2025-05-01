import { shared } from "use-broadcast-ts";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StoreState } from "./slices";
import { createAppSlice } from "./slices/app";
import { createConnectionsSlice } from "./slices/connections";
import { createDataSlice } from "./slices/data";
import { createDeckFiltersSlice } from "./slices/deck-collection-filters";
import { createDeckCreateSlice } from "./slices/deck-create";
import { createDeckEditsSlice } from "./slices/deck-edits";
import { createListsSlice } from "./slices/lists";
import { createLookupTablesSlice } from "./slices/lookup-tables";
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
  ...createMetadataSlice(...args),
  ...createLookupTablesSlice(...args),
  ...createListsSlice(...args),
  ...createSettingsSlice(...args),
  ...createUISlice(...args),
  ...createDeckEditsSlice(...args),
  ...createDeckCreateSlice(...args),
  ...createSharingSlice(...args),
  ...createDeckFiltersSlice(...args),
  ...createConnectionsSlice(...args),
  ...createRemotingSlice(...args),
  ...createRecommenderSlice(...args),
});

export const useStore = create<StoreState>()(
  import.meta.env.MODE === "test"
    ? stateCreator
    : devtools(
        shared(stateCreator, {
          merge(state, receivedState) {
            return { ...state, ...receivedState };
          },
          partialize(state) {
            return {
              connections: state.connections,
              data: state.data,
              deckEdits: state.deckEdits,
              settings: state.settings,
              sharing: state.sharing,
              app: state.app,
              remoting: state.remoting,
            };
          },
          skipSerialization: true,
        }),
      ),
);
