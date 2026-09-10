import { type Browser, expect, type Page, test } from "@playwright/test";
import { importDeckFromFile } from "../../e2e/tests/actions.ts";
import {
  reloadAndSyncAccount,
  waitForAccountSync,
} from "../lib/account-sync.ts";
import { login, logout } from "../lib/auth.ts";
import { createAuthenticatedAccount } from "../lib/db.ts";
import { apiUrl } from "../lib/env.ts";

test.describe("account folders", () => {
  test("local deck archive survives logout and login", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);

    await importDeckFromFile(page, "hunch_deck.json", { navigate: "view" });
    await toggleArchiveStatus(page);
    await waitForAccountSync(page);

    await logout(page);
    await login(page, account.email, account.password);
    await expect(page).toHaveURL(/\/$/);
    await waitForAccountSync(page);

    await expectDeckArchived(page, "Le Diamond");
  });

  test("account deck archive syncs across sessions", async ({
    baseURL,
    browser,
    page,
  }) => {
    const account = await createAuthenticatedAccount(page);

    await importDeckFromFile(page, "hunch_deck.json", { navigate: "view" });
    await uploadAccountDeck(page);
    await toggleArchiveStatus(page);
    await waitForAccountSync(page);

    const { context, page2 } = await openLoggedInPage(
      browser,
      baseURL,
      account,
    );
    await waitForAccountSync(page2);
    await expectDeckArchived(page2, "Le Diamond");

    await context.close();
  });

  test("account deck unarchive syncs across sessions", async ({
    baseURL,
    browser,
    page,
  }) => {
    const account = await createAuthenticatedAccount(page);

    await importDeckFromFile(page, "hunch_deck.json", { navigate: "view" });
    await uploadAccountDeck(page);
    await toggleArchiveStatus(page);
    await waitForAccountSync(page);
    await toggleArchiveStatus(page);
    await waitForAccountSync(page);

    const { context, page2 } = await openLoggedInPage(
      browser,
      baseURL,
      account,
    );
    await waitForAccountSync(page2);
    await expectDeckUnarchived(page2, "Le Diamond");

    await context.close();
  });

  test("folder conflicts set sync status and are cleared by reload", async ({
    baseURL,
    browser,
    page,
  }) => {
    const account = await createAuthenticatedAccount(page);

    await importDeckFromFile(page, "hunch_deck.json", { navigate: "view" });
    await uploadAccountDeck(page);
    await waitForAccountSync(page);

    const { context, page2 } = await openLoggedInPage(
      browser,
      baseURL,
      account,
    );
    await waitForAccountSync(page2);
    await openDeck(page2, "Le Diamond");

    await page.bringToFront();
    await toggleArchiveStatus(page);
    await waitForAccountSync(page);

    await page2.bringToFront();
    await toggleArchiveStatus(page2);
    await expect(
      page2.getByTestId("masthead-account-sync-status"),
    ).toHaveAttribute("data-sync-status", "conflict");
    await toggleArchiveStatus(page2);
    await reloadAndSyncAccount(page2);
    await expectDeckArchived(page2, "Le Diamond");

    await context.close();
  });
});

async function toggleArchiveStatus(page: Page) {
  const response = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/v2/account/folders` &&
      response.request().method() === "PUT",
  );

  await page.getByTestId("view-more-actions").click();
  await page.getByTestId("view-archive").click();
  await page.getByTestId("view-more-actions").press("Escape");
  await response;
}

async function uploadAccountDeck(page: Page) {
  const response = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/v2/account/decks` &&
      response.request().method() === "POST",
  );

  await page.getByTestId("view-more-actions").click();
  await page.getByTestId("view-upload-account").click();
  await response;
}

async function openDeck(page: Page, deckName: string) {
  await page.goto("/");
  await page
    .getByTestId(`collection-deck-${deckName}`)
    .getByTestId("deck-summary-title")
    .click({ force: true });
  await expect(page).toHaveURL(/\/deck\/view/);
}

async function expectDeckArchived(page: Page, deckName: string) {
  await page.goto("/");
  const folder = page.getByTestId("collection-folder-Archive");
  await expect(folder).toBeVisible();
  await folder.click();
  await expect(page.getByTestId(`collection-deck-${deckName}`)).toBeVisible();
}

async function expectDeckUnarchived(page: Page, deckName: string) {
  await page.goto("/");
  await expect(page.getByTestId("collection-folder-Archive")).not.toBeVisible();
  await expect(page.getByTestId(`collection-deck-${deckName}`)).toBeVisible();
}

async function openLoggedInPage(
  browser: Browser,
  baseURL: string | undefined,
  account: Awaited<ReturnType<typeof createAuthenticatedAccount>>,
) {
  const context = await browser.newContext({ baseURL });
  const page2 = await context.newPage();
  await login(page2, account.email, account.password);
  await expect(page2).toHaveURL(/\/$/);
  return { context, page2 };
}
