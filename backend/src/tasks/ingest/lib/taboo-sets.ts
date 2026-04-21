import { readFile } from "node:fs/promises";
import path from "node:path";
import type { JsonDataTabooSet } from "@arkham-build/shared";
import type { Config } from "../../../lib/config.ts";
import { readPoFile } from "./gettext.ts";
import { downloadRepo } from "./github.ts";
import type { WithItemTranslations } from "./json-data.types.ts";

export function downloadTabooRepo(config: Config) {
  return downloadRepo(config.INGEST_TABOO_DATA_REPO, "taboo-data");
}

export function resolveTabooSets(taboos: JsonDataTabooSet[]) {
  return taboos.map((t) => ({
    id: t.id,
    name: tabooSetName(t.id),
    card_count: t.cards.length,
    date_start: t.date_start,
    code: t.code,
  }));
}

function tabooSetName(id: number) {
  switch (id) {
    case 1:
      return "1.5";
    case 2:
      return "1.6";
    case 3:
      return "1.8";
    case 4:
      return "1.9";
    case 5:
      return "2.0";
    case 6:
      return "2.1";
    case 7:
      return "2.2";
    case 8:
      return "2.3";
    case 9:
      return "2.4";
    case 10:
      return "2.5";
    default:
      return "x.x";
  }
}

type Opts = {
  file: string;
  locales: string[];
};

export type TabooSetWithTranslations = Omit<JsonDataTabooSet, "cards"> & {
  cards: WithItemTranslations<JsonDataTabooSet["cards"][0]>[];
};

export async function getTabooDataWithTranslations(root: string, opts: Opts) {
  const { data, poCatalogues } = await readDataWithTranslations(root, opts);
  return data.map(
    (set) =>
      ({
        ...set,
        cards: set.cards.map((tabooCard) => {
          const translations = poCatalogues.reduce(
            (acc, { locale, catalog }) => {
              const translatedKeys: Record<string, string> = {};

              for (const [k, v] of Object.entries(tabooCard)) {
                if (typeof v === "string") {
                  translatedKeys[k] = catalog[v] ?? v;
                }
              }

              if (Object.keys(translatedKeys).length > 0) {
                acc.push({ locale, ...translatedKeys });
              }

              return acc;
            },
            [] as TabooSetWithTranslations["cards"][0]["translations"],
          );

          return {
            ...tabooCard,
            translations,
          };
        }),
      }) as TabooSetWithTranslations,
  );
}

async function readDataWithTranslations(root: string, opts: Opts) {
  const sourcePath = path.join(root, opts.file);

  const translationPaths = opts.locales.map((locale) => ({
    locale,
    filePath: path.join(
      root,
      "i18n",
      locale,
      opts.file.replace(".json", ".po"),
    ),
  }));

  const [data, ...poCatalogues] = await Promise.all([
    safeReadJson<JsonDataTabooSet>(sourcePath),
    ...translationPaths.map(({ locale, filePath }) =>
      readPoFile(filePath).then((catalog) => ({ locale, catalog })),
    ),
  ]);

  return {
    data,
    poCatalogues,
  };
}

async function safeReadJson<T>(path: string): Promise<T[]> {
  try {
    const fs = await readFile(path, "utf-8");
    return JSON.parse(fs) as T[];
  } catch {
    return [];
  }
}
