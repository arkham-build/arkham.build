import type { ApiCard, DataVersion } from "@arkham-build/shared";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { EncounterSet } from "@/store/schemas/encounter-set.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import type { TabooSet } from "@/store/schemas/taboo-set.schema";
import type { HttpClient } from "../http-client";

export type MetadataApiResponse = {
  data: Omit<MetadataResponse, "faction" | "reprint_pack" | "type" | "subtype">;
};

export type MetadataResponse = {
  cycle: Cycle[];
  pack: Pack[];
  card_encounter_set: EncounterSet[];
  taboo_set: TabooSet[];
};

export async function queryMetadata(
  client: HttpClient,
  locale = "en",
): Promise<MetadataResponse> {
  const res = await client.request(`/v1/cache/metadata/${locale}`);
  const { data }: MetadataApiResponse = await res.json();

  return {
    ...data,
    card_encounter_set: data.card_encounter_set,
    pack: data.pack,
  };
}

export type DataVersionApiResponse = {
  data: {
    all_card_updated: DataVersion[];
  };
};

export type DataVersionResponse = DataVersion;

export async function queryDataVersion(
  client: HttpClient,
  locale = "en",
): Promise<DataVersion> {
  const res = await client.request(`/v1/cache/version/${locale}`);
  const { data }: DataVersionApiResponse = await res.json();
  return data.all_card_updated[0];
}

export type AllCardApiResponse = {
  data: {
    all_card: ApiCard[];
  };
};

export type AllCardResponse = ApiCard[];

export async function queryCards(
  client: HttpClient,
  locale = "en",
): Promise<ApiCard[]> {
  const res = await client.request(`/v1/cache/cards/${locale}`);
  const { data }: AllCardApiResponse = await res.json();
  return data.all_card;
}
