import type { FanMadeProject, FanMadeProjectInfo } from "@arkham-build/shared";
import { assert } from "@/utils/assert";
import type { HttpClient } from "../http-client";

export async function queryFanMadeProjects(
  client: HttpClient,
): Promise<FanMadeProjectInfo[]> {
  const res = await client.request("/v2/public/fan-made-project-info");
  const { data }: { data: FanMadeProjectInfo[] } = await res.json();
  return data.sort((a, b) => {
    return a.meta.name.localeCompare(b.meta.name);
  });
}

export async function queryFanMadeProjectData(
  bucketPath: string,
): Promise<FanMadeProject> {
  const res = await fetch(
    `${import.meta.env.VITE_CARD_IMAGE_URL}/${bucketPath}?nonce=${Date.now()}`,
  );

  assert(res.ok, `Failed to fetch ${bucketPath}`);
  const data = await res.json();
  return data;
}
