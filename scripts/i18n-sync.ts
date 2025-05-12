import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

type JsonObject = { [key: string]: JsonValue };
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

syncLocales("en");

function syncLocales(primary: string) {
  const primaryLocale = readLocale(`${primary}.json`);

  const localePaths = fs.readdirSync(path.join(process.cwd(), "./src/locales"));

  for (const localePath of localePaths) {
    if (localePath === `${primary}.json` || !localePath.endsWith("json")) {
      continue;
    }

    const locale = readLocale(localePath);

    const synced = sync(primaryLocale, locale);
    writeLocale(localePath.replace(".json", ""), synced);
  }

  writeLocale(primary, primaryLocale);
}

function sync(primary: JsonObject, locale: JsonObject) {
  const newLocale = {};

  for (const key in primary) {
    if (Array.isArray(primary[key])) {
      throw new Error("Arrays are not supported in locale files.");
    }

    if (isObject(primary[key])) {
      newLocale[key] = sync(
        primary[key],
        isObject(locale[key]) ? locale[key] : {},
      );
    } else {
      let found = 0;

      for (const k of getPlurals(key)) {
        if (locale[k]) {
          assert(
            typeof locale[k] === "string",
            `Invalid value for ${k}: should be a string.`,
          );
          found += 1;
          newLocale[k] = locale[k];
        }
      }

      if (!found) {
        newLocale[key] = primary[key];
      }
    }
  }

  return newLocale;
}

function readLocale(filename: string) {
  const filePath = path.join(process.cwd(), `./src/locales/${filename}`);
  const contents = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(contents);
}

function writeLocale(lng: string, data: JsonObject) {
  const filePath = path.join(process.cwd(), `./src/locales/${lng}.json`);
  const contents = JSON.stringify(sortJSON(data), null, 2);
  fs.writeFileSync(filePath, contents);
}

function isObject(x: unknown): x is JsonObject {
  return typeof x === "object" && x !== null;
}

function getPlurals(key: string) {
  const pluralKeys = ["zero", "one", "two", "few", "many", "other"];

  const root = pluralKeys.some((pluralKey) => key.endsWith(`_${pluralKey}`))
    ? key.slice(0, key.lastIndexOf("_"))
    : key;

  const keys = pluralKeys.map((pluralKey) => `${root}_${pluralKey}`);
  keys.unshift(root);
  return keys;
}

function sortJSON(obj: JsonValue) {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) return obj.map(sortJSON);

  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortJSON(obj[key]);
      return acc;
    }, {});
}
