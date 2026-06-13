import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  reloadAndSyncAccount,
  waitForAccountSync,
} from "../lib/account-sync.ts";
import { login } from "../lib/auth.ts";
import { createAuthenticatedAccount } from "../lib/db.ts";
import { apiUrl } from "../lib/env.ts";

test.describe("account settings", () => {
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
