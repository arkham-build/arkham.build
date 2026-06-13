import { expect, type Page } from "@playwright/test";
import { apiUrl } from "./env.ts";

export async function reloadAndSyncAccount(page: Page) {
  await page.reload();
  await syncAccount(page);
}

export async function syncAccount(page: Page) {
  await page.getByTestId("masthead-account-menu").click();
  await expect(page.getByTestId("masthead-account-sync")).toBeEnabled();

  const response = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/v2/account/decks/manifest` &&
      response.request().method() === "GET",
    { timeout: 120000 },
  );

  await page.getByTestId("masthead-account-sync").click();
  await response;
  await waitForAccountSync(page);
}

export async function waitForAccountSync(page: Page) {
  await expect(
    page.getByTestId("masthead-account-sync-status"),
  ).toHaveAttribute("data-sync-status", "synced", { timeout: 120000 });
}
