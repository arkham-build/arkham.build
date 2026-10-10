import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_DATA_DIRECTORY = fileURLToPath(
  new URL("../../../../data/", import.meta.url),
);
const EXCLUDED_FILES = new Set(["starter_decks.json"]);

export async function getLocalDataHash(
  dataDirectory = LOCAL_DATA_DIRECTORY,
): Promise<string> {
  const entries = await readdir(dataDirectory, {
    recursive: true,
    withFileTypes: true,
  });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const absolutePath = path.join(entry.parentPath, entry.name);
      const relativePath = path
        .relative(dataDirectory, absolutePath)
        .split(path.sep)
        .join(path.posix.sep);

      return { absolutePath, relativePath };
    })
    .filter(({ relativePath }) => !EXCLUDED_FILES.has(relativePath))
    .sort((a, b) => {
      if (a.relativePath < b.relativePath) return -1;
      if (a.relativePath > b.relativePath) return 1;
      return 0;
    });

  const contents = await Promise.all(
    files.map(async (file) => ({
      ...file,
      content: await readFile(file.absolutePath),
    })),
  );

  const hash = createHash("sha256");

  for (const file of contents) {
    hash.update(file.relativePath);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }

  return hash.digest("hex");
}
