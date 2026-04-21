import { readdir } from "node:fs/promises";
import path from "node:path";
import type {
  JsonDataCard,
  JsonDataCycle,
  JsonDataEncounterSet,
  JsonDataFaction,
  JsonDataPack,
  JsonDataSubtype,
  JsonDataType,
} from "@arkham-build/shared";
import { serializeRecords } from "../../db/db.helpers.ts";
import { connectionString, getDatabase } from "../../db/db.ts";
import { chunkArray } from "../../lib/chunk-array.ts";
import { configFromEnv } from "../../lib/config.ts";
import { mergeTranslations, resolveCards } from "./lib/cards.ts";
import { resolveCycles } from "./lib/cycles.ts";
import { syncDataVersions } from "./lib/data-version.ts";
import { resolveEncounterSets } from "./lib/encounter-sets.ts";
import { resolveFactions } from "./lib/factions.ts";
import {
  downloadJsonDataRepo,
  getMetadataWithTranslations,
  withTranslations,
} from "./lib/json-data.ts";
import { applyLocalData } from "./lib/local-data.ts";
import { resolvePacks } from "./lib/packs.ts";
import {
  downloadTabooRepo,
  getTabooDataWithTranslations,
  resolveTabooSets,
} from "./lib/taboo-sets.ts";

async function ingest() {
  const config = configFromEnv();
  const db = getDatabase(connectionString(config));

  const [{ path: dir, sha: jsonDataSha }, { path: tabooDir, sha: tabooSha }] =
    await Promise.all([
      downloadJsonDataRepo(config),
      downloadTabooRepo(config),
    ]);

  const packFiles = await readdir(path.join(dir, "pack"), {
    recursive: true,
  }).then((files) => files.filter((file) => file.endsWith(".json")));

  const {
    cardResolutions,
    cards,
    cycles,
    encounterSets,
    factions,
    packs,
    subtypes,
    tabooSets,
    types,
  } = await Promise.all([
    getMetadataWithTranslations<JsonDataFaction>(dir, {
      locales: config.METADATA_LOCALES,
      file: "factions.json",
    }),
    getMetadataWithTranslations<JsonDataSubtype>(dir, {
      locales: config.METADATA_LOCALES,
      file: "subtypes.json",
    }),
    getMetadataWithTranslations<JsonDataType>(dir, {
      locales: config.METADATA_LOCALES,
      file: "types.json",
    }),
    getMetadataWithTranslations<JsonDataCycle>(dir, {
      locales: config.METADATA_LOCALES,
      file: "cycles.json",
    }),
    getMetadataWithTranslations<JsonDataEncounterSet>(dir, {
      locales: config.METADATA_LOCALES,
      file: "encounters.json",
    }),
    getMetadataWithTranslations<JsonDataPack>(dir, {
      locales: config.METADATA_LOCALES,
      file: "packs.json",
    }),
    getTabooDataWithTranslations(tabooDir, {
      locales: config.METADATA_LOCALES,
      file: "taboos.json",
    }),
    ...packFiles.map((file) =>
      getMetadataWithTranslations<JsonDataCard>(dir, {
        locales: config.METADATA_LOCALES,
        file: `pack/${file}`,
      }),
    ),
  ]).then(
    ([
      factions,
      subtypes,
      types,
      cycles,
      encounterSets,
      packs,
      tabooSets,
      ...cardPacks
    ]) => {
      const allCardTranslations = mergeTranslations(cardPacks);

      const data = applyLocalData({
        cards: cardPacks.flatMap((pack) =>
          pack.data.map((c) => withTranslations(c, allCardTranslations)),
        ),
        cycles: cycles.data.map((c) =>
          withTranslations(c, cycles.translations),
        ),
        encounterSets: encounterSets.data.map((e) =>
          withTranslations(e, encounterSets.translations),
        ),
        packs: packs.data.map((p) => withTranslations(p, packs.translations)),
      });

      const { cardResolutions, cards } = resolveCards(data.cards, tabooSets);

      return {
        cardResolutions,
        cards,
        cycles: resolveCycles(data.cycles),
        encounterSets: resolveEncounterSets(data.encounterSets, cards),
        factions: resolveFactions(
          factions.data.map((f) => withTranslations(f, factions.translations)),
        ),
        packs: resolvePacks(data.packs),
        subtypes: subtypes.data.map((s) =>
          withTranslations(s, subtypes.translations),
        ),
        tabooSets: resolveTabooSets(tabooSets),
        types: types.data.map((t) => withTranslations(t, types.translations)),
      };
    },
  );

  await db.transaction().execute(async (tx) => {
    await tx.deleteFrom("card_resolution").execute();
    await tx.deleteFrom("card").execute();
    await tx.deleteFrom("encounter_set").execute();
    await tx.deleteFrom("pack").execute();
    await tx.deleteFrom("cycle").execute();
    await tx.deleteFrom("taboo_set").execute();
    await tx.deleteFrom("faction").execute();
    await tx.deleteFrom("subtype").execute();
    await tx.deleteFrom("type").execute();

    await tx.insertInto("faction").values(serializeRecords(factions)).execute();
    await tx.insertInto("subtype").values(serializeRecords(subtypes)).execute();
    await tx.insertInto("type").values(serializeRecords(types)).execute();

    await tx
      .insertInto("taboo_set")
      .values(serializeRecords(tabooSets))
      .execute();

    await tx.insertInto("cycle").values(serializeRecords(cycles)).execute();
    await tx.insertInto("pack").values(serializeRecords(packs)).execute();
    await tx
      .insertInto("encounter_set")
      .values(serializeRecords(encounterSets))
      .execute();

    for (const chunk of chunkArray(cards, 500)) {
      await tx.insertInto("card").values(serializeRecords(chunk)).execute();
    }

    for (const chunk of chunkArray(cardResolutions, 500)) {
      await tx
        .insertInto("card_resolution")
        .values(serializeRecords(chunk))
        .execute();
    }

    await syncDataVersions(tx, {
      locales: config.METADATA_LOCALES,
      sha: `${jsonDataSha}:${tabooSha}`,
      cardCount: cards.length,
    });
  });

  await db.destroy();
}

await ingest();
