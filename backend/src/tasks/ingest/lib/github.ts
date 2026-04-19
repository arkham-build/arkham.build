import assert from "node:assert";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import * as tar from "tar";
import type { RepoRef } from "../../../lib/config.ts";

export async function downloadRepo(repo: RepoRef, pathPrefix: string) {
  const res = await fetch(archiveUrl(repo));

  assert(res.ok, `Failed to download repo ${repo.repo}: ${res.statusText}`);
  assert(res.body, `Failed to download repo ${repo.repo}: no body`);

  const targetPath = path.join(tmpdir(), `${pathPrefix}-${Date.now()}`);

  await mkdir(targetPath, { recursive: true });

  await finished(
    Readable.fromWeb(res.body).pipe(tar.x({ cwd: targetPath, strip: 1 })),
  );

  return targetPath;
}

function archiveUrl({ repo, branch }: RepoRef) {
  return `https://api.github.com/repos/${repo}/tarball/${branch}`;
}
