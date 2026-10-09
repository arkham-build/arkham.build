import { setTimeout as delay } from "node:timers/promises";

export async function waitForCondition(
  predicate: () => Promise<boolean>,
  timeoutMs = 60000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await delay(500);
  }

  throw new Error("Timed out waiting for condition");
}

export async function waitForUrl(
  url: string,
  predicate: (response: Response) => boolean,
) {
  await waitForCondition(async () => {
    try {
      const response = await fetch(url, {
        redirect: "manual",
      });
      return predicate(response);
    } catch {
      return false;
    }
  });
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}
