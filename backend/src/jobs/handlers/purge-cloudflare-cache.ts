import { z } from "zod";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout.ts";
import { log } from "../../lib/logger.ts";

const purgeConfigSchema = z.object({
  CLOUDFLARE_API_TOKEN: z.string().min(1),
  CLOUDFLARE_ZONE_ID: z.string().min(1),
});

const CACHE_TAG = "cache";

type PurgeConfig = z.infer<typeof purgeConfigSchema>;

export async function runPurgeCloudflareCache() {
  const purgeConfig = purgeConfigSchema.safeParse(process.env);

  if (!purgeConfig.success) {
    log("info", "Missing Cloudflare Cache configuration, skipping purge");
    return;
  }

  await purgeTags(purgeConfig.data, [CACHE_TAG]);
}

type CloudflarePurgeResponse = {
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
};

async function purgeTags(purgeConfig: PurgeConfig, tags: string[]) {
  const response = await fetchWithTimeout(cloudflarePurgeUrl(purgeConfig), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${purgeConfig.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tags }),
  });

  const result = (await response.json()) as CloudflarePurgeResponse;

  if (!response.ok || !result.success) {
    throw new Error(
      `Cloudflare purge failed (${response.status}): ${formatCloudflareErrors(result)}`,
    );
  }
}

function cloudflarePurgeUrl(purgeConfig: PurgeConfig) {
  return `https://api.cloudflare.com/client/v4/zones/${purgeConfig.CLOUDFLARE_ZONE_ID}/purge_cache`;
}

function formatCloudflareErrors(result: CloudflarePurgeResponse) {
  if (!result.errors.length) return "Unknown error";

  return result.errors
    .map((error) => `${error.code}: ${error.message}`)
    .join(", ");
}
