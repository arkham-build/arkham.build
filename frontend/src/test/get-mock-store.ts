import { useStore } from "@/store";
import factions from "@/store/services/data/factions.json";
import reprintPacks from "@/store/services/data/reprint_packs.json";
import subTypes from "@/store/services/data/subtypes.json";
import types from "@/store/services/data/types.json";
import type {
  AllCardApiResponse,
  DataVersionApiResponse,
  MetadataApiResponse,
} from "@/store/services/queries";
import allCardStub from "@/test/fixtures/stubs/all_card.json";
import dataVersionStub from "@/test/fixtures/stubs/data_version.json";
import metadataStub from "@/test/fixtures/stubs/metadata.json";
import { packToApiFormat } from "@/utils/arkhamdb-json-format";

function queryStubMetadata() {
  return Promise.resolve({
    ...(metadataStub as MetadataApiResponse).data,
    pack: metadataStub.data.pack,
    reprint_pack: reprintPacks.map(packToApiFormat),
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

export async function getMockStore() {
  useStore.setState(useStore.getInitialState(), true);
  const state = useStore.getState();
  await state.init(queryStubMetadata, queryStubDataVersion, queryStubCardData);
  return useStore;
}
