import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { apiUrl, arkhamDbBaseUrl, arkhamDbTestApiKey, runId } from "./env.ts";
import { waitForCondition } from "./wait.ts";

export type ArkhamDbOAuthApp = {
  clientId: string;
  clientSecret: string;
};

export type ArkhamDbUser = {
  deckId: number | null;
  email: string;
  password: string;
  userId: number;
  username: string;
};

export async function waitForArkhamDbReady() {
  let lastStatus = "no response";

  try {
    await waitForCondition(async () => {
      const response = await fetch(
        `${arkhamDbBaseUrl}/_arkhamdb-docker/health`,
        {
          headers: testHeaders(),
        },
      ).catch((error: unknown) => {
        lastStatus = error instanceof Error ? error.message : String(error);
        return null;
      });

      if (!response) {
        return false;
      }

      const text = await response.text();

      if (!response.ok) {
        lastStatus = `${response.status} ${text}`;
        return false;
      }

      try {
        const body = JSON.parse(text) as { ok?: unknown };
        if (body.ok === true) {
          return true;
        }

        lastStatus = text;
        return false;
      } catch {
        lastStatus = text;
        return false;
      }
    }, 300000);
  } catch (error) {
    throw new Error(`Timed out waiting for ArkhamDB: ${lastStatus}`, {
      cause: error,
    });
  }
}

export function createArkhamDbOAuthApp() {
  return arkhamDbTestRequest<ArkhamDbOAuthApp>("/test/oauth-apps", {
    name: `arkham-build-e2e-${runId}`,
    redirectUri: `${apiUrl}/auth/arkhamdb/callback`,
  });
}

export function createArkhamDbUser(
  options: { createDeck?: boolean } = {},
): Promise<ArkhamDbUser> {
  const suffix = randomUUID();
  const username = `e2e-${suffix}`;
  const email = `${username}@example.com`;
  const password = "SecurePassword123!";

  return arkhamDbTestRequest<ArkhamDbUser>("/test/users", {
    createDeck: options.createDeck ?? true,
    email,
    password,
    username,
  });
}

export async function authorizeArkhamDbOAuth(page: Page, user: ArkhamDbUser) {
  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(user.password);
  await page.locator("#_submit").click();
  await page.locator('input[name="accepted"]').click();
}

async function arkhamDbTestRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${arkhamDbBaseUrl}/_arkhamdb-docker${path}`, {
    body: JSON.stringify(body),
    headers: {
      ...testHeaders(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`ArkhamDB test request failed: ${response.status} ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`ArkhamDB test request returned invalid JSON: ${text}`, {
      cause: error,
    });
  }
}

function testHeaders() {
  return {
    "X-ArkhamDB-Docker-Test-API-Key": arkhamDbTestApiKey,
  };
}
