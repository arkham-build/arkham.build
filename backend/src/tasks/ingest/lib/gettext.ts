import { readFile } from "node:fs/promises";

export type PoCatalog = Record<string, string>;

type Field = "msgid" | "msgstr" | null;

function parsePo(source: string): PoCatalog {
  const catalog: PoCatalog = {};

  let currentField: Field = null;
  let currentId = "";
  let currentStr = "";

  const flush = () => {
    if (currentId !== "") {
      catalog[currentId] = currentStr;
    }

    currentField = null;
    currentId = "";
    currentStr = "";
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      flush();
      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("msgid")) {
      if (currentField !== null && (currentId !== "" || currentStr !== "")) {
        flush();
      }

      currentField = "msgid";
      currentId = parsePoString(line.slice(5).trim());
      continue;
    }

    if (line.startsWith("msgstr")) {
      currentField = "msgstr";
      currentStr = parsePoString(line.slice(6).trim());
      continue;
    }

    if (line.startsWith('"')) {
      const value = parsePoString(line);

      if (currentField === "msgid") {
        currentId += value;
      } else if (currentField === "msgstr") {
        currentStr += value;
      }
    }
  }

  flush();

  return catalog;
}

function parsePoString(token: string): string {
  if (!token.startsWith('"')) {
    throw new Error(`Expected quoted PO string, got: ${token}`);
  }

  return JSON.parse(token) as string;
}

export async function readPoFile(filePath: string): Promise<PoCatalog> {
  try {
    const content = await readFile(filePath, "utf-8");
    return parsePo(content);
  } catch {
    return {};
  }
}
