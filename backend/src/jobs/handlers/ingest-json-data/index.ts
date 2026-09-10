import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  GrimoireEntrySchema,
  GrimoireSectionSchema,
  JsonDataCampaignSchema,
  type JsonDataCard,
  type JsonDataCycle,
  type JsonDataEncounterSet,
  JsonDataErrataSchema,
  type JsonDataFaction,
  JsonDataFaqSchema,
  type JsonDataPack,
  JsonDataRulesVersionSchema,
  JsonDataScenarioSchema,
  type JsonDataSubtype,
  type JsonDataType,
} from "@arkham-build/shared";
import { serializeRecords } from "../../../db/db.helpers.ts";
import { connectionString, getDatabase } from "../../../db/db.ts";
import { chunkArray } from "../../../lib/chunk-array.ts";
import { configFromEnv } from "../../../lib/config.ts";
import { resolveCampaignRecords } from "./lib/campaign.ts";
import { mergeTranslations, resolveCards } from "./lib/cards.ts";
import { resolveCycles } from "./lib/cycles.ts";
import { syncDataVersions } from "./lib/data-version.ts";
import { resolveEncounterSets } from "./lib/encounter-sets.ts";
import {
  resolveErrataRecords,
  resolveErrataReferenceRecords,
} from "./lib/errata.ts";
import { resolveFactions } from "./lib/factions.ts";
import { resolveFaqRecords, resolveFaqReferenceRecords } from "./lib/faq.ts";
import {
  resolveGrimoireEntries,
  resolveGrimoireEntryReferences,
  resolveGrimoireSections,
} from "./lib/grimoire.ts";
import {
  downloadJsonDataRepo,
  downloadMetadataRepo,
  getJsonData,
  getMetadataWithTranslations,
  withTranslations,
} from "./lib/json-data.ts";
import { applyLocalData } from "./lib/local-data.ts";
import { resolvePacks } from "./lib/packs.ts";
import { resolveRulesVersions } from "./lib/rules-versions.ts";
import { resolveScenarioRecords } from "./lib/scenario.ts";
import {
  downloadTabooRepo,
  getTabooDataWithTranslations,
  resolveTabooSets,
} from "./lib/taboo-sets.ts";

type DownloadedRepo = Awaited<ReturnType<typeof downloadJsonDataRepo>>;

export async function runIngestJsonData() {
  const config = configFromEnv();
  const db = getDatabase(connectionString(config));

  const downloadedRepos: DownloadedRepo[] = [];
  const trackDownloadedRepo = async (download: Promise<DownloadedRepo>) => {
    const repo = await download;
    downloadedRepos.push(repo);
    return repo;
  };

  try {
    const [
      { path: dir, sha: jsonDataSha },
      { path: metadataDir, sha: metadataSha },
      { path: tabooDir, sha: tabooSha },
    ] = await Promise.all([
      trackDownloadedRepo(downloadJsonDataRepo(config)),
      trackDownloadedRepo(downloadMetadataRepo(config)),
      trackDownloadedRepo(downloadTabooRepo(config)),
    ]);

    const [packFiles, grimoireFiles] = await Promise.all([
      readdir(path.join(dir, "pack"), {
        recursive: true,
      }).then((files) => files.filter((file) => file.endsWith(".json"))),
      readdir(path.join(metadataDir, "grimoire"), {
        recursive: true,
      })
        .then((files) => files.filter((file) => file.endsWith(".json")))
        .catch(() => []),
    ]);

    const grimoireSectionFiles = grimoireFiles.filter(
      (file) => path.parse(file).name === "sections",
    );
    const grimoireEntryFiles = grimoireFiles.filter(
      (file) => path.parse(file).name !== "sections",
    );

    const {
      cardResolutions,
      cards,
      cycles,
      encounterSets,
      factions,
      packs,
      campaignRecords,
      errataRecords,
      faqRecords,
      grimoireEntries,
      grimoireEntryReferences,
      grimoireSections,
      rulesVersions,
      scenarioRecords,
      sourceErrata,
      sourceFaq,
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
      getJsonData(
        metadataDir,
        "campaigns/campaigns.json",
        JsonDataCampaignSchema.array(),
      ),
      getJsonData(
        metadataDir,
        "scenarios/scenarios.json",
        JsonDataScenarioSchema.array(),
      ),
      Promise.all([
        getJsonData(
          metadataDir,
          "errata/campaign_errata.json",
          JsonDataErrataSchema.array(),
        ),
        getJsonData(
          metadataDir,
          "errata/card_errata.json",
          JsonDataErrataSchema.array(),
        ),
        getJsonData(
          metadataDir,
          "errata/rulebook_errata.json",
          JsonDataErrataSchema.array(),
        ),
      ]).then((data) => data.flat()),
      Promise.all([
        getJsonData(
          metadataDir,
          "faqs/campaign_faq.json",
          JsonDataFaqSchema.array(),
        ),
        getJsonData(
          metadataDir,
          "faqs/general_faq.json",
          JsonDataFaqSchema.array(),
        ),
      ]).then((data) => data.flat()),
      Promise.all(
        grimoireSectionFiles.map((file) =>
          getJsonData(
            metadataDir,
            `grimoire/${file}`,
            GrimoireSectionSchema.array(),
          ),
        ),
      ).then((data) => data.flat()),
      Promise.all(
        grimoireEntryFiles.map((file) =>
          getJsonData(
            metadataDir,
            `grimoire/${file}`,
            GrimoireEntrySchema.array(),
          ),
        ),
      ).then((data) => data.flat()),
      getJsonData(
        metadataDir,
        "versions.json",
        JsonDataRulesVersionSchema.array(),
      ),
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
        campaigns,
        scenarios,
        errata,
        faq,
        sourceGrimoireSections,
        sourceGrimoireEntries,
        rulesVersions,
        ...cardPacks
      ]) => {
        const allCardTranslations = mergeTranslations(cardPacks);

        const localData = applyLocalData({
          cards: cardPacks.flatMap((pack) => pack.data),
          cycles: cycles.data,
          encounterSets: encounterSets.data,
          packs: packs.data,
        });

        const data = {
          cards: localData.cards.map((card) =>
            withTranslations(card, allCardTranslations),
          ),
          cycles: localData.cycles.map((cycle) =>
            withTranslations(cycle, cycles.translations),
          ),
          encounterSets: localData.encounterSets.map((encounterSet) =>
            withTranslations(encounterSet, encounterSets.translations),
          ),
          packs: localData.packs.map((pack) =>
            withTranslations(pack, packs.translations),
          ),
        };

        const { cardResolutions, cards } = resolveCards(data.cards, tabooSets);

        return {
          cardResolutions,
          cards,
          cycles: resolveCycles(data.cycles),
          encounterSets: resolveEncounterSets(data.encounterSets, cards),
          factions: resolveFactions(
            factions.data.map((f) =>
              withTranslations(f, factions.translations),
            ),
          ),
          packs: resolvePacks(data.packs),
          campaignRecords: resolveCampaignRecords(campaigns),
          errataRecords: resolveErrataRecords(errata),
          faqRecords: resolveFaqRecords(faq),
          grimoireEntries: resolveGrimoireEntries(sourceGrimoireEntries),
          grimoireEntryReferences: resolveGrimoireEntryReferences(
            sourceGrimoireEntries,
          ),
          grimoireSections: resolveGrimoireSections(sourceGrimoireSections),
          rulesVersions: resolveRulesVersions(rulesVersions),
          scenarioRecords: resolveScenarioRecords(scenarios),
          sourceErrata: errata,
          sourceFaq: faq,
          subtypes: subtypes.data.map((s) =>
            withTranslations(s, subtypes.translations),
          ),
          tabooSets: resolveTabooSets(tabooSets),
          types: types.data.map((t) => withTranslations(t, types.translations)),
        };
      },
    );

    if (!rulesVersions.length) {
      throw new Error("No rules versions found in metadata repository");
    }

    if (!grimoireSections.length) {
      throw new Error("No grimoire sections found in metadata repository");
    }

    if (!grimoireEntries.length) {
      throw new Error("No grimoire entries found in metadata repository");
    }

    await db.transaction().execute(async (tx) => {
      await tx.deleteFrom("faq_card").execute();
      await tx.deleteFrom("faq_cycle").execute();
      await tx.deleteFrom("faq_scenario").execute();
      await tx.deleteFrom("faq").execute();
      await tx.deleteFrom("errata_card").execute();
      await tx.deleteFrom("errata_cycle").execute();
      await tx.deleteFrom("errata_scenario").execute();
      await tx.deleteFrom("errata").execute();
      await tx.deleteFrom("grimoire_entry_reference").execute();
      await tx.deleteFrom("grimoire_entry").execute();
      await tx.deleteFrom("grimoire_section").execute();
      await tx.deleteFrom("rules_version").execute();
      await tx.deleteFrom("scenario_encounter_set_card").execute();
      await tx.deleteFrom("scenario_encounter_set").execute();
      await tx.deleteFrom("campaign_scenario").execute();
      await tx.deleteFrom("scenario").execute();
      await tx.deleteFrom("campaign").execute();
      await tx.deleteFrom("card_resolution").execute();
      await tx.deleteFrom("card").execute();
      await tx.deleteFrom("encounter_set").execute();
      await tx.deleteFrom("pack").execute();
      await tx.deleteFrom("cycle").execute();
      await tx.deleteFrom("taboo_set").execute();
      await tx.deleteFrom("faction").execute();
      await tx.deleteFrom("subtype").execute();
      await tx.deleteFrom("type").execute();

      await tx
        .insertInto("faction")
        .values(serializeRecords(factions))
        .execute();
      await tx
        .insertInto("subtype")
        .values(serializeRecords(subtypes))
        .execute();
      await tx.insertInto("type").values(serializeRecords(types)).execute();

      await tx
        .insertInto("taboo_set")
        .values(serializeRecords(tabooSets))
        .execute();

      await tx
        .insertInto("rules_version")
        .values(serializeRecords(rulesVersions))
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

      if (campaignRecords.campaigns.length) {
        await tx
          .insertInto("campaign")
          .values(serializeRecords(campaignRecords.campaigns))
          .execute();
      }

      if (scenarioRecords.scenarios.length) {
        await tx
          .insertInto("scenario")
          .values(serializeRecords(scenarioRecords.scenarios))
          .execute();
      }

      if (campaignRecords.campaignScenarios.length) {
        await tx
          .insertInto("campaign_scenario")
          .values(serializeRecords(campaignRecords.campaignScenarios))
          .execute();
      }

      if (scenarioRecords.scenarioEncounterSets.length) {
        await tx
          .insertInto("scenario_encounter_set")
          .values(serializeRecords(scenarioRecords.scenarioEncounterSets))
          .execute();
      }

      if (scenarioRecords.scenarioEncounterSetCards.length) {
        await tx
          .insertInto("scenario_encounter_set_card")
          .values(serializeRecords(scenarioRecords.scenarioEncounterSetCards))
          .execute();
      }

      if (grimoireSections.length) {
        await tx
          .insertInto("grimoire_section")
          .values(serializeRecords(grimoireSections))
          .execute();
      }

      if (grimoireEntries.length) {
        await tx
          .insertInto("grimoire_entry")
          .values(serializeRecords(grimoireEntries))
          .execute();
      }

      if (grimoireEntryReferences.length) {
        await tx
          .insertInto("grimoire_entry_reference")
          .values(serializeRecords(grimoireEntryReferences))
          .execute();
      }

      const insertedErrata = errataRecords.length
        ? await tx
            .insertInto("errata")
            .values(serializeRecords(errataRecords))
            .returning(["id", "position"])
            .execute()
        : [];

      const errataReferences = resolveErrataReferenceRecords(
        sourceErrata,
        new Map(insertedErrata.map((item) => [item.position, item.id])),
      );

      if (errataReferences.errataCards.length) {
        await tx
          .insertInto("errata_card")
          .values(serializeRecords(errataReferences.errataCards))
          .execute();
      }

      if (errataReferences.errataCycles.length) {
        await tx
          .insertInto("errata_cycle")
          .values(serializeRecords(errataReferences.errataCycles))
          .execute();
      }

      if (errataReferences.errataScenarios.length) {
        await tx
          .insertInto("errata_scenario")
          .values(serializeRecords(errataReferences.errataScenarios))
          .execute();
      }

      const insertedFaq = faqRecords.length
        ? await tx
            .insertInto("faq")
            .values(serializeRecords(faqRecords))
            .returning(["id", "position"])
            .execute()
        : [];

      const faqReferences = resolveFaqReferenceRecords(
        sourceFaq,
        new Map(insertedFaq.map((item) => [item.position, item.id])),
      );

      if (faqReferences.faqCards.length) {
        await tx
          .insertInto("faq_card")
          .values(serializeRecords(faqReferences.faqCards))
          .execute();
      }

      if (faqReferences.faqCycles.length) {
        await tx
          .insertInto("faq_cycle")
          .values(serializeRecords(faqReferences.faqCycles))
          .execute();
      }

      if (faqReferences.faqScenarios.length) {
        await tx
          .insertInto("faq_scenario")
          .values(serializeRecords(faqReferences.faqScenarios))
          .execute();
      }

      await syncDataVersions(tx, {
        locales: config.METADATA_LOCALES,
        sha: `${jsonDataSha}:${metadataSha}:${tabooSha}`,
        cardCount: cards.length,
      });
    });
  } finally {
    await Promise.all(
      downloadedRepos.map(({ path }) =>
        rm(path, { force: true, recursive: true }).catch(console.error),
      ),
    );
    await db.destroy();
  }
}
