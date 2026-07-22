import { randomUUID } from "node:crypto";
import { expect, type Page, type Response, test } from "@playwright/test";
import { getDatabase } from "../../../backend/src/db/db.ts";
import { hashPassword } from "../../../backend/src/features/auth/lib/crypto.ts";
import { authorizeArkhamDbOAuth, createArkhamDbUser } from "../lib/arkhamdb.ts";
import { createAccount } from "../lib/db.ts";
import { apiUrl, databaseUrl, frontendUrl } from "../lib/env.ts";

const CALLBACK_URI = `${frontendUrl}/oauth/client-callback?existing=kept`;
const PASSWORD = "SecurePassword123!";

test.describe("OAuth consent", () => {
  test("continues through email login and requires a decision every time", async ({
    page,
  }) => {
    const account = await createAccount();
    const clientId = await createOAuthClient("Email login OAuth client");

    await startAuthorization(page, clientId, "first-state");
    await expect(page).toHaveURL(/\/auth\/login\?redirect=/);

    await page.locator("#email").fill(account.email);
    await page.locator("#password").fill(account.password);
    const claimResponsePromise = page.waitForResponse(isConsentClaimResponse);
    await page.getByRole("button", { name: "Log in" }).click();

    expect((await claimResponsePromise).status()).toBe(200);
    await expectConsentReady(page, "Email login OAuth client");
    await page.getByRole("button", { name: "Allow" }).click();

    await expect(page).toHaveURL(/\/oauth\/client-callback\?/);
    const approvalCallback = new URL(page.url());
    expect(approvalCallback.searchParams.get("existing")).toBe("kept");
    expect(approvalCallback.searchParams.get("state")).toBe("first-state");
    expect(approvalCallback.searchParams.get("code")).toMatch(/^ab_code_/);

    await startAuthorization(page, clientId, "second-state");
    await expectConsentReady(page, "Email login OAuth client");
    await expect(page).toHaveURL(/\/oauth\/consent\?request=/);

    await page.getByRole("button", { name: "Deny" }).click();

    const denialCallback = new URL(page.url());
    expect(denialCallback.pathname).toBe("/oauth/client-callback");
    expect(denialCallback.searchParams.get("existing")).toBe("kept");
    expect(denialCallback.searchParams.get("state")).toBe("second-state");
    expect(denialCallback.searchParams.get("error")).toBe("access_denied");
  });

  test("preserves consent through profile completion", async ({ page }) => {
    const account = await createIncompleteEmailAccount();
    const clientId = await createOAuthClient("Profile completion OAuth client");

    await startAuthorization(page, clientId, "profile-state");
    await page.locator("#email").fill(account.email);
    await page.locator("#password").fill(account.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/auth\/signup\/complete\?redirect=/);
    await page.locator("#username").fill(`oauth-profile-${randomUUID()}`);
    await page.getByRole("button", { name: "Complete your profile" }).click();

    await expectConsentReady(page, "Profile completion OAuth client");
    await page.getByRole("button", { name: "Allow" }).click();

    const callback = new URL(page.url());
    expect(callback.pathname).toBe("/oauth/client-callback");
    expect(callback.searchParams.get("state")).toBe("profile-state");
    expect(callback.searchParams.get("code")).toMatch(/^ab_code_/);
  });

  test("preserves consent through ArkhamDB login", async ({ page }) => {
    const arkhamDbUser = await createArkhamDbUser();
    await createArkhamLinkedAccount(arkhamDbUser.userId);
    const clientId = await createOAuthClient("ArkhamDB login OAuth client");

    await startAuthorization(page, clientId, "arkhamdb-state");
    const claimResponsePromise = page.waitForResponse(isConsentClaimResponse);
    await page.getByRole("link", { name: "Log in with ArkhamDB" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    expect((await claimResponsePromise).status()).toBe(200);
    await expectConsentReady(page, "ArkhamDB login OAuth client");
    await page.getByRole("button", { name: "Deny" }).click();

    const callback = new URL(page.url());
    expect(callback.pathname).toBe("/oauth/client-callback");
    expect(callback.searchParams.get("state")).toBe("arkhamdb-state");
    expect(callback.searchParams.get("error")).toBe("access_denied");
  });
});

function isConsentClaimResponse(response: Response) {
  const url = new URL(response.url());
  return (
    url.pathname.endsWith("/claim") &&
    url.pathname.includes("/oauth/authorization-requests/") &&
    response.request().method() === "POST"
  );
}

async function startAuthorization(page: Page, clientId: string, state: string) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: CALLBACK_URI,
    response_type: "code",
    scope: "profile:read decks:write",
    state,
  });

  await page.goto(`${apiUrl}/v2/oauth/authorize?${query.toString()}`);
}

async function expectConsentReady(page: Page, clientName: string) {
  await expect(page).toHaveURL(/\/oauth\/consent\?request=/, {
    timeout: 30000,
  });
  await expect(page.getByTestId("oauth-consent-ready")).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("heading", { name: `Authorize ${clientName}` }),
  ).toBeVisible();
  await expect(page.getByText("Read profile", { exact: true })).toBeVisible();
  await expect(page.getByText("Read decks", { exact: true })).toBeVisible();
  await expect(page.getByText("Write decks", { exact: true })).toBeVisible();
}

async function createOAuthClient(name: string) {
  const db = getDatabase(databaseUrl);

  try {
    const client = await db
      .insertInto("oauth_client")
      .values({ name, secret_hash: "fullstack-test-secret-hash" })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("oauth_client_redirect_uri")
      .values({ oauth_client_id: client.id, redirect_uri: CALLBACK_URI })
      .execute();
    return client.id;
  } finally {
    await db.destroy();
  }
}

async function createIncompleteEmailAccount() {
  const db = getDatabase(databaseUrl);
  const suffix = randomUUID();
  const email = `oauth-incomplete-${suffix}@example.com`;

  try {
    const account = await db
      .insertInto("account")
      .values({
        name: `oauth-incomplete-${suffix}`,
        profile_completed_at: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("account_identity")
      .values({
        account_id: account.id,
        email,
        password_hash: await hashPassword(PASSWORD),
        provider: "email",
        provider_user_id: email,
        verified_at: new Date(),
      })
      .execute();

    return { email, password: PASSWORD };
  } finally {
    await db.destroy();
  }
}

async function createArkhamLinkedAccount(providerUserId: number) {
  const db = getDatabase(databaseUrl);

  try {
    const account = await db
      .insertInto("account")
      .values({ name: `oauth-arkhamdb-${randomUUID()}` })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("account_identity")
      .values({
        account_id: account.id,
        provider: "arkhamdb",
        provider_user_id: String(providerUserId),
        verified_at: new Date(),
      })
      .execute();
  } finally {
    await db.destroy();
  }
}
