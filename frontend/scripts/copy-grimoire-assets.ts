import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../");
const sourceDir = path.join(
  repoRoot,
  "../arkhamlcg-metadata",
  "grimoire",
  "assets",
);
const targetDir = path.join(
  repoRoot,
  "frontend",
  "public",
  "assets",
  "grimoire",
);

await copyGrimoireAssets();

async function copyGrimoireAssets() {
  await rm(targetDir, { force: true, recursive: true });
  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { force: true, recursive: true });
}
