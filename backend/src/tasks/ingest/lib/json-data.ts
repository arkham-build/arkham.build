import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Config } from "../../../lib/config.ts";
import { downloadRepo } from "./github.ts";
import type {
  Coded,
  ItemTranslation,
  Translatable,
  TranslationTable,
  WrappedTranslation,
} from "./json-data.types.ts";

export function downloadJsonDataRepo(config: Config) {
  return downloadRepo(config.INGEST_JSON_DATA_REPO, "json-data");
}

type Opts = {
  file: string;
  locales: string[];
};

export async function getMetadataWithTranslations<T extends Coded>(
  root: string,
  opts: Opts,
) {
  const { data, translations } = await readDataWithTranslations<T>(root, opts);
  return { data, translations: translationTable(translations) };
}

async function readDataWithTranslations<T>(root: string, opts: Opts) {
  const sourcePath = path.join(root, opts.file);

  const translationPaths = opts.locales.map((locale) => ({
    locale,
    filePath: path.join(root, "translations", locale, opts.file),
  }));

  const [data, ...translations] = await Promise.all([
    safeReadJson<T>(sourcePath),
    ...translationPaths.map(
      async ({ locale, filePath }) =>
        ({
          locale,
          translation: await safeReadJson<Translatable<T>>(filePath),
        }) as WrappedTranslation<T>,
    ),
  ]);

  return {
    data,
    translations,
  };
}

function translationTable<T>(translations: WrappedTranslation<T>[]) {
  const table: TranslationTable<T> = {};

  for (const { locale, translation } of translations) {
    table[locale] = {};
    for (const t of translation) {
      table[locale][t.code] = t;
    }
  }

  return table;
}

export function withTranslations<T extends Coded>(
  item: T,
  table: TranslationTable<T>,
) {
  const translations = Object.entries(table).reduce((acc, [locale, data]) => {
    // biome-ignore lint/suspicious/noExplicitAny: FIXME: hack.
    const duplicateId = (item as any)?.duplicate_of;

    const t = data[item.code] ?? (duplicateId ? data[duplicateId] : undefined);
    if (!t) return acc;

    const entries = Object.entries(t).reduce(
      (acc, [key, value]) => {
        if (value) {
          acc[key as keyof Translatable<T>] = value;
        }
        return acc;
      },
      {} as Translatable<T>,
    );

    if (Object.keys(entries).length > 0) {
      acc.push({
        ...entries,
        locale,
      });
    }

    return acc;
  }, [] as ItemTranslation<T>[]);

  return { ...item, translations };
}

async function safeReadJson<T>(path: string): Promise<T[]> {
  try {
    const fs = await readFile(path, "utf-8");
    return JSON.parse(fs) as T[];
  } catch {
    return [];
  }
}
