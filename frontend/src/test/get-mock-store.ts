import type { Pack } from "@arkham-build/shared";
import allCardStub from "@test/fixtures/stubs/all_card.json";
import dataVersionStub from "@test/fixtures/stubs/data_version.json";
import metadataStub from "@test/fixtures/stubs/metadata.json";
import { useStore } from "@/store";
import factions from "@/store/services/data/factions.json";
import subTypes from "@/store/services/data/subtypes.json";
import types from "@/store/services/data/types.json";
import { createHttpClient } from "@/store/services/http-client";
import type {
  AllCardApiResponse,
  DataVersionApiResponse,
  MetadataApiResponse,
} from "@/store/services/requests/cache";

function queryStubMetadata() {
  return Promise.resolve({
    ...(metadataStub as MetadataApiResponse).data,
    pack: metadataStub.data.pack as Pack[],
    faction: factions,
    type: types,
    subtype: subTypes,
  });
}

function queryStubDataVersion() {
  return Promise.resolve(
    (dataVersionStub as DataVersionApiResponse).data.all_card_updated[0],
  );
}

function queryStubCardData() {
  const data = allCardStub;
  const allCards = (data as AllCardApiResponse).data.all_card;
  return Promise.resolve(allCards);
}

export function getMockHttpClient(
  onUnauthorized: () => Promise<void> | void = () => undefined,
) {
  return createHttpClient({
    apiUrl: "http://localhost",
    onUnauthorized,
  });
}

export async function getMockStore() {
  useStore.setState(useStore.getInitialState(), true);

  const state = useStore.getState();
  await state.init(queryStubMetadata, queryStubDataVersion, queryStubCardData);
  return useStore;
}
