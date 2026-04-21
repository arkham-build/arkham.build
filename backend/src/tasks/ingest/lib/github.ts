import assert from "node:assert";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import * as tar from "tar";
import type { RepoRef } from "../../../lib/config.ts";

type GitHubCommit = {
  sha?: string;
};

export async function downloadRepo(repo: RepoRef, pathPrefix: string) {
  const sha = await resolveCommitSha(repo);
  const res = await fetch(archiveUrl(repo.repo, sha), {
    headers: githubHeaders(),
  });

  assert(res.ok, `Failed to download repo ${repo.repo}: ${res.statusText}`);
  assert(res.body, `Failed to download repo ${repo.repo}: no body`);

  const targetPath = path.join(tmpdir(), `${pathPrefix}-${Date.now()}`);

  await mkdir(targetPath, { recursive: true });

  await finished(
    Readable.fromWeb(res.body).pipe(tar.x({ cwd: targetPath, strip: 1 })),
  );

  return { path: targetPath, sha };
}

async function resolveCommitSha({ repo, branch }: RepoRef) {
  const res = await fetch(commitUrl(repo, branch), {
    headers: githubHeaders(),
  });

  assert(
    res.ok,
    `Failed to resolve commit for repo ${repo}@${branch}: ${res.statusText}`,
  );

  const body = (await res.json()) as GitHubCommit;

  assert(body.sha, `Failed to resolve commit for repo ${repo}@${branch}`);

  return body.sha;
}

function archiveUrl(repo: string, ref: string) {
  return `https://api.github.com/repos/${repo}/tarball/${ref}`;
}

function commitUrl(repo: string, ref: string) {
  return `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`;
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "arkham-build-ingest",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
