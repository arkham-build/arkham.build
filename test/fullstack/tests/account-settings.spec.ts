import { type Browser, expect, type Page, test } from "@playwright/test";
import { getDatabase } from "../../../backend/src/db/db.ts";
import {
  reloadAndSyncAccount,
  waitForAccountSync,
} from "../lib/account-sync.ts";
import { login } from "../lib/auth.ts";
import { createAuthenticatedAccount } from "../lib/db.ts";
import { apiUrl, databaseUrl } from "../lib/env.ts";

test.describe("account settings", () => {
  test("lists and revokes a connected app after confirmation", async ({
    page,
  }) => {
    const account = await createAuthenticatedAccount(page);
    const connectedApp = await seedConnectedApp(account.accountId);

    await page.goto("/settings?tab=account");
    const app = page
      .getByRole("article")
      .filter({ has: page.getByTestId("connected-app-status") })
      .filter({ hasText: "Arkham Cards" });
    await expect(app).toBeVisible();
    await expect(app).toContainText("Read profile");
    await expect(app).toContainText("Connected");

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url() ===
          `${apiUrl}/v2/account/oauth/grants/${connectedApp.clientId}` &&
        response.request().method() === "DELETE",
    );
    const dialogPromise = page.waitForEvent("dialog");
    const clickPromise = app
      .getByRole("button", { name: "Disconnect" })
      .click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("Arkham Cards");
    await dialog.accept();
    await clickPromise;
    expect((await deleteResponsePromise).status()).toBe(204);

    await expect(app).toBeHidden();
  });

  test("settings are sticky and applied in a separate session", async ({
    baseURL,
    browser,
    page,
  }) => {
    const account = await createAuthenticatedAccount(page);

    await page.goto("/settings");
    await waitForAccountSync(page);

    await page
      .getByTestId("settings-default-environment")
      .selectOption("current");

    await saveSettings(page);
    await waitForAccountSync(page);

    await reloadAndSyncAccount(page);
    await expect(page.getByTestId("settings-default-environment")).toHaveValue(
      "current",
    );

    const context = await browser.newContext({ baseURL });
    const page2 = await context.newPage();

    await login(page2, account.email, account.password);
    await expect(page2).toHaveURL(/\/$/);
    await page2.goto("/settings");
    await waitForAccountSync(page2);
    await expect(page2.getByTestId("settings-default-environment")).toHaveValue(
      "current",
    );

    await context.close();
  });

  test("settings conflicts can be resolved by loading remote settings", async ({
    baseURL,
    browser,
    page,
  }) => {
    const { context, page2 } = await openSettingPages(page, browser, baseURL);

    await page
      .getByTestId("settings-default-environment")
      .selectOption("current");
    await saveSettings(page);
    await waitForAccountSync(page);

    await page2
      .getByTestId("settings-default-environment")
      .selectOption("legacy");
    await saveSettings(page2);

    await expect(
      page2.getByTestId("masthead-account-sync-status"),
    ).toHaveAttribute("data-sync-status", "conflict");
    await expect(page2.getByTestId("toast")).toContainText(
      "Your account settings changed somewhere else.",
    );

    await page2.getByRole("button", { name: "Reload page" }).click();
    await waitForAccountSync(page2);

    await expect(page2.getByTestId("settings-default-environment")).toHaveValue(
      "current",
    );

    await context.close();
  });

  test("settings conflicts can be resolved by overwriting remote settings", async ({
    baseURL,
    browser,
    page,
  }) => {
    const { context, page2 } = await openSettingPages(page, browser, baseURL);

    await page
      .getByTestId("settings-default-environment")
      .selectOption("current");
    await saveSettings(page);
    await waitForAccountSync(page);

    await page2
      .getByTestId("settings-default-environment")
      .selectOption("legacy");
    await saveSettings(page2);

    await expect(
      page2.getByTestId("masthead-account-sync-status"),
    ).toHaveAttribute("data-sync-status", "conflict");
    await expect(page2.getByTestId("toast")).toContainText(
      "Your account settings changed somewhere else.",
    );

    await page2.getByRole("button", { name: "Overwrite" }).click();
    await waitForAccountSync(page2);

    await expect(page2.getByTestId("settings-default-environment")).toHaveValue(
      "legacy",
    );

    await context.close();
    await reloadAndSyncAccount(page);

    await expect(page.getByTestId("settings-default-environment")).toHaveValue(
      "legacy",
    );
  });
});

async function seedConnectedApp(accountId: string) {
  const db = getDatabase(databaseUrl);

  try {
    const client = await db
      .insertInto("oauth_client")
      .values({
        name: "Arkham Cards",
        secret_hash: "fullstack-test-secret-hash",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("oauth_grant")
      .values({
        account_id: accountId,
        oauth_client_id: client.id,
        scopes: ["profile:read"],
      })
      .execute();

    return { clientId: client.id };
  } finally {
    await db.destroy();
  }
}

async function saveSettings(page: Page) {
  const response = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/v2/account/settings` &&
      response.request().method() === "PUT",
  );

  await page.getByTestId("settings-save").click();
  await response;
}

async function openSettingPages(
  page: Page,
  browser: Browser,
  baseURL: string | undefined,
) {
  const account = await createAuthenticatedAccount(page);
  await page.goto("/settings");
  await waitForAccountSync(page);

  const context = await browser.newContext({ baseURL });
  const page2 = await context.newPage();
  await login(page2, account.email, account.password);
  await expect(page2).toHaveURL(/\/$/);
  await page2.goto("/settings");
  await waitForAccountSync(page2);

  return { context, page2 };
}
