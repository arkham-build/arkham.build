import { expect, type Page, type Response } from "@playwright/test";
import { apiUrl } from "./env.ts";

export async function reloadAndSyncAccount(page: Page) {
  await page.reload();
  await syncAccount(page);
}

export async function syncAccount(page: Page) {
  await page.getByTestId("masthead-account-menu").click();
  await expect(page.getByTestId("masthead-account-sync")).toBeEnabled();

  await Promise.all([
    page.waitForResponse(isForcedAccountDeckManifestResponse, {
      timeout: 120000,
    }),
    page.getByTestId("masthead-account-sync").click(),
  ]);
  await waitForAccountSync(page);
}

export async function waitForAccountSync(page: Page) {
  await expect(
    page.getByTestId("masthead-account-sync-status"),
  ).toHaveAttribute("data-sync-status", "synced", { timeout: 120000 });
}

function isForcedAccountDeckManifestResponse(response: Response) {
  const url = new URL(response.url());

  return (
    url.origin === new URL(apiUrl).origin &&
    url.pathname === "/v2/account/decks/manifest" &&
    url.searchParams.get("forceArkhamdbSync") === "true" &&
    response.request().method() === "GET"
  );
}
