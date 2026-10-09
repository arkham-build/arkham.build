import { readFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import type { Config } from "../../../../lib/config.ts";
import type {
  Coded,
  ItemTranslation,
  Translatable,
  TranslationTable,
  WrappedTranslation,
} from "../../../../lib/json-data.types.ts";
import { downloadRepo } from "./github.ts";

export function downloadJsonDataRepo(config: Config) {
  return downloadRepo(config.INGEST_JSON_DATA_REPO, "json-data");
}

export function downloadMetadataRepo(config: Config) {
  return downloadRepo(config.INGEST_METADATA_REPO, "metadata");
}

type MetadataOptions<
  SourceItem extends Coded,
  TranslationItem extends Coded,
> = {
  file: string;
  locales: string[];
  schema?: z.ZodType<SourceItem[]>;
  translationFile?: string;
  translationSchema?: z.ZodType<TranslationItem[]>;
};

export async function getMetadataWithTranslations<
  SourceItem extends Coded,
  TranslationItem extends Coded = Translatable<SourceItem>,
>(root: string, opts: MetadataOptions<SourceItem, TranslationItem>) {
  const { data, translations } = await readDataWithTranslations(root, opts);
  return {
    data,
    translations: translationTable<SourceItem, TranslationItem>(translations),
  };
}

export async function getJsonData<Data>(
  root: string,
  file: string,
  schema: z.ZodType<Data>,
) {
  return schema.parse(await safeReadJson<unknown>(path.join(root, file)));
}

async function readDataWithTranslations<
  SourceItem extends Coded,
  TranslationItem extends Coded,
>(root: string, opts: MetadataOptions<SourceItem, TranslationItem>) {
  const sourcePath = path.join(root, opts.file);
  const translationFile = opts.translationFile ?? opts.file;

  const translationPaths = opts.locales.map((locale) => ({
    locale,
    filePath: path.join(root, "translations", locale, translationFile),
  }));

  const [data, ...translations] = await Promise.all([
    readSourceData(sourcePath, opts.schema),
    ...translationPaths.map(async ({ locale, filePath }) => ({
      locale,
      translation: await readTranslationData(filePath, opts.translationSchema),
    })),
  ]);

  return {
    data,
    translations,
  };
}

function translationTable<SourceItem, TranslationItem extends Coded>(
  translations: WrappedTranslation<SourceItem, TranslationItem>[],
) {
  const table: TranslationTable<SourceItem, TranslationItem> = {};

  for (const { locale, translation } of translations) {
    table[locale] = {};
    for (const t of translation) {
      table[locale][t.code] = t;
    }
  }

  return table;
}

export function withTranslations<
  SourceItem extends Coded,
  TranslationItem extends Coded = Translatable<SourceItem>,
>(item: SourceItem, table: TranslationTable<SourceItem, TranslationItem>) {
  const translations = Object.entries(table).reduce((acc, [locale, data]) => {
    const duplicateId =
      "duplicate_of" in item && typeof item.duplicate_of === "string"
        ? item.duplicate_of
        : undefined;

    const duplicateTranslation = duplicateId ? data[duplicateId] : undefined;

    const translation = data[item.code] ?? duplicateTranslation;
    if (!translation) return acc;

    const { code: _code, ...entries } = translation;

    if (Object.keys(entries).length > 0) {
      acc.push({
        ...entries,
        locale,
      });
    }

    return acc;
  }, [] as ItemTranslation<TranslationItem>[]);

  return { ...item, translations };
}

async function readSourceData<SourceItem>(
  filePath: string,
  schema: z.ZodType<SourceItem[]> | undefined,
): Promise<SourceItem[]> {
  if (!schema) return safeReadJson<SourceItem>(filePath);

  return schema.parse(await readJson(filePath));
}

async function readTranslationData<TranslationItem>(
  filePath: string,
  schema: z.ZodType<TranslationItem[]> | undefined,
): Promise<TranslationItem[]> {
  if (!schema) return safeReadJson<TranslationItem>(filePath);

  const data = await readOptionalJson(filePath);
  return data === undefined ? [] : schema.parse(data);
}

async function readOptionalJson(filePath: string) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf-8")) as unknown;
}

async function safeReadJson<Item>(filePath: string): Promise<Item[]> {
  try {
    return (await readJson(filePath)) as Item[];
  } catch {
    return [];
  }
}
