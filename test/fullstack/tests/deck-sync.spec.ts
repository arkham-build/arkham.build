import type { Deck, StorageProvider } from "@arkham-build/shared";
import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  adjustListCardQuantity,
  fillSearch,
  importDeckFromFile,
} from "../../e2e/tests/actions.ts";
import {
  reloadAndSyncAccount,
  waitForAccountSync,
} from "../lib/account-sync.ts";
import { authorizeArkhamDbOAuth, createArkhamDbUser } from "../lib/arkhamdb.ts";
import { login } from "../lib/auth.ts";
import {
  createAuthenticatedAccount,
  deleteArkhamDbOAuthToken,
} from "../lib/db.ts";
import { apiUrl } from "../lib/env.ts";

const accountProvider = "account" satisfies StorageProvider;
const arkhamDbProvider = "arkhamdb" satisfies StorageProvider;

test.describe("account deck sync", () => {
  test("create, edit, upgrade, delete upgrade, and upgrade again", async ({
    baseURL,
    browser,
    page,
  }) => {
    const account = await createAuthenticatedAccount(page);
    await exerciseSyncedDeckLifecycle(
      page,
      browser,
      baseURL,
      account,
      accountProvider,
      "Account Deck",
    );
  });

  test("delete", async ({ page }) => {
    await createAuthenticatedAccount(page);
    await createSyncedDeck(page, accountProvider, "Deleted Account Deck");
    await deleteCurrentDeck(page);
    await reloadAndSyncAccount(page);
    await expect(
      page.getByTestId("collection-deck-Deleted Account Deck"),
    ).not.toBeVisible();
  });

  test("upload", async ({ baseURL, browser, page }) => {
    const account = await createAuthenticatedAccount(page);
    await importDeckFromFile(page, "hunch_deck.json", { navigate: "view" });
    await uploadDeck(page, accountProvider);
    await reloadAndSyncAccount(page);
    await expect(page.getByTestId("view-edit")).toBeVisible();
    await expectDeckInNewSession(browser, baseURL, account, "Le Diamond");
  });
});

test.describe("ArkhamDB deck sync", () => {
  test("create, edit, upgrade, delete upgrade, and upgrade again", async ({
    baseURL,
    browser,
    page,
  }) => {
    test.setTimeout(120_000);

    const account = await createConnectedAccount(page);
    await exerciseSyncedDeckLifecycle(
      page,
      browser,
      baseURL,
      account,
      arkhamDbProvider,
      "ArkhamDB Deck",
    );
  });

  test("delete", async ({ page }) => {
    await createConnectedAccount(page);
    await createSyncedDeck(page, arkhamDbProvider, "Deleted ArkhamDB Deck");
    await deleteCurrentDeck(page);
    await expect(
      page.getByTestId("collection-deck-Deleted ArkhamDB Deck"),
    ).not.toBeVisible();
  });

  test("upload", async ({ baseURL, browser, page }) => {
    const account = await createConnectedAccount(page);
    await importDeckFromFile(page, "hunch_deck.json", { navigate: "view" });
    await uploadDeck(page, arkhamDbProvider);
    await reloadAndSyncAccount(page);
    await expect(page.getByTestId("view-edit")).toBeVisible();
    await expectDeckInNewSession(browser, baseURL, account, "Le Diamond");
  });
});

test.describe("deck sync edge cases", () => {
  test("account and ArkhamDB decks survive reload when both providers are active", async ({
    page,
  }) => {
    await createConnectedAccount(page);
    await createSyncedDeck(
      page,
      accountProvider,
      "Both Providers Account Deck",
    );
    await createSyncedDeck(
      page,
      arkhamDbProvider,
      "Both Providers ArkhamDB Deck",
    );

    await page.goto("/");
    await waitForAccountSync(page);
    await reloadAndSyncAccount(page);

    await expect(
      page.getByTestId("collection-deck-Both Providers Account Deck"),
    ).toBeVisible();
    await expect(
      page.getByTestId("collection-deck-Both Providers ArkhamDB Deck"),
    ).toBeVisible();
  });

  test("missing ArkhamDB token keeps existing decks and marks sync partial", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const account = await createConnectedAccount(page);
    await createSyncedDeck(page, accountProvider, "Partial Sync Account Deck");
    await createSyncedDeck(
      page,
      arkhamDbProvider,
      "Partial Sync ArkhamDB Deck",
    );

    await deleteArkhamDbOAuthToken(account.accountId);
    await page.goto("/");
    await syncAccount(page, account.name);

    await expect(
      page.getByTestId("masthead-account-sync-status"),
    ).toHaveAttribute("data-sync-status", "partial", { timeout: 120_000 });
    await page.goto("/");
    await expect(
      page.getByTestId("collection-deck-Partial Sync Account Deck"),
    ).toBeVisible();
    await expect(
      page.getByTestId("collection-deck-Partial Sync ArkhamDB Deck"),
    ).toBeVisible();
  });

  test("fan-made investigator survives ArkhamDB upload and sync", async ({
    page,
  }) => {
    await createConnectedAccount(page);
    await importDeckFromFile(page, "fan_made_content.json");
    await page
      .getByTestId("collection-deck-The Don Francisco Amato Job")
      .getByTestId("deck-summary-title")
      .click({ force: true });
    await expectDeckInvestigator(page, "Don Francisco Amato");

    await uploadDeck(page, arkhamDbProvider);
    await reloadAndSyncAccount(page);

    await expect(page.getByTestId("view-edit")).toBeVisible();
    await expectDeckInvestigator(page, "Don Francisco Amato");
  });

  test("sync errors do not remove decks", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);
    const deck = await createSyncedDeck(
      page,
      accountProvider,
      "Sync Error Account Deck",
    );

    await page.goto("/");
    await expect(
      page.getByTestId("collection-deck-Sync Error Account Deck"),
    ).toBeVisible();

    await updateRemoteAccountDeck(page, deck);

    let failedBatchPost = false;
    await page.route(`${apiUrl}/v2/account/decks/batch`, async (route) => {
      if (route.request().method() !== "POST" || failedBatchPost) {
        await route.continue();
        return;
      }

      failedBatchPost = true;
      await route.abort("failed");
    });

    const batchRequestFailed = page.waitForEvent("requestfailed", (request) => {
      return (
        request.url() === `${apiUrl}/v2/account/decks/batch` &&
        request.method() === "POST"
      );
    });
    await syncAccount(page, account.name);
    await batchRequestFailed;

    await expect(
      page.getByTestId("masthead-account-sync-status"),
    ).toHaveAttribute("data-sync-status", "error");
    await expect(
      page.getByTestId("collection-deck-Sync Error Account Deck"),
    ).toBeVisible();
  });
});

async function exerciseSyncedDeckLifecycle(
  page: Page,
  browser: Browser,
  baseURL: string | undefined,
  account: Awaited<ReturnType<typeof createAuthenticatedAccount>>,
  provider: Extract<StorageProvider, "account" | "arkhamdb">,
  title: string,
) {
  await createSyncedDeck(page, provider, title);
  await reloadAndSyncAccount(page);
  await expectDeckInNewSession(browser, baseURL, account, title);

  await editCurrentDeck(page);
  await reloadAndSyncAccount(page);

  await upgradeCurrentDeck(page, 5);
  await reloadAndSyncAccount(page);
  await expectDeckInNewSession(browser, baseURL, account, title, {
    latestUpgrade: "0 of 5 XP spent",
  });

  await deleteCurrentUpgrade(page);
  await reloadAndSyncAccount(page);

  await upgradeCurrentDeck(page, 3);
  await reloadAndSyncAccount(page);
  await expectDeckInNewSession(browser, baseURL, account, title, {
    latestUpgrade: "0 of 3 XP spent",
  });
}

async function createSyncedDeck(
  page: Page,
  provider: Extract<StorageProvider, "account" | "arkhamdb">,
  title: string,
) {
  await page.goto("/deck/create/01001");
  await page.getByTestId("create-provider").selectOption(provider);
  await page.getByTestId("create-title").fill(title);

  const response = waitForDeckResponse(
    page,
    "POST",
    `${apiUrl}/v2/account/decks`,
  );
  await page.getByTestId("create-save").click();
  await response;

  await expect(page.getByTestId("editor-tabs-slots")).toBeVisible();
  const saveResponse = waitForDeckResponse(
    page,
    "PUT",
    `${apiUrl}/v2/account/decks/`,
  );
  await page.getByTestId("editor-save").click();
  const savedDeck = (await (await saveResponse).json()) as Deck;
  await expect(page.getByTestId("view-edit")).toBeVisible();

  return savedDeck;
}

async function updateRemoteAccountDeck(page: Page, deck: Deck) {
  const response = await page.request.put(
    `${apiUrl}/v2/account/decks/${deck.id}`,
    {
      data: {
        ...deck,
        expectedVersion: deck.version,
        name: `${deck.name} Remote`,
        source: accountProvider,
        version: "errsync1",
      },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Remote deck update failed: ${response.status()} ${await response.text()}`,
    );
  }
}

async function editCurrentDeck(page: Page) {
  await page.getByTestId("view-edit").click();
  await fillSearch(page, ".45 automatic");
  await adjustListCardQuantity(page, "01016", "increment");

  const response = waitForDeckResponse(
    page,
    "PUT",
    `${apiUrl}/v2/account/decks/`,
  );
  await page.getByTestId("editor-save").click();
  await response;

  await expect(page.getByTestId("view-edit")).toBeVisible();
}

async function upgradeCurrentDeck(page: Page, xp: number) {
  await page.getByTestId("view-upgrade").click();
  await page.getByTestId("upgrade-xp").fill(String(xp));

  const response = waitForDeckResponse(
    page,
    "POST",
    `${apiUrl}/v2/account/decks/upgrade/`,
  );
  await page.getByTestId("upgrade-save-close").click();
  await response;

  await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
    `0 of ${xp} XP spent`,
  );
}

async function deleteCurrentUpgrade(page: Page) {
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });

  const response = waitForDeckResponse(
    page,
    "DELETE",
    `${apiUrl}/v2/account/decks/`,
  );
  await page.getByTestId("view-more-actions").click();
  await page.getByTestId("view-delete-upgrade").click();
  await response;

  await expect(page.getByTestId("view-upgrade")).toBeVisible();
}

async function deleteCurrentDeck(page: Page) {
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });

  const response = waitForDeckResponse(
    page,
    "DELETE",
    `${apiUrl}/v2/account/decks/`,
  );
  await page.getByTestId("view-more-actions").click();
  await page.getByTestId("view-delete").click();
  await response;

  await expect(page).toHaveURL(/\/$/);
}

async function uploadDeck(
  page: Page,
  provider: Extract<StorageProvider, "account" | "arkhamdb">,
) {
  const response = waitForDeckResponse(
    page,
    "POST",
    `${apiUrl}/v2/account/decks`,
  );
  await page.getByTestId("view-more-actions").click();
  await page.getByTestId(`view-upload-${provider}`).click();
  const uploadedDeck = (await (await response).json()) as Deck;
  await expect(page).toHaveURL(
    (url) => url.pathname === `/deck/view/${uploadedDeck.id}`,
  );
  await expect(page.getByTestId("view-edit")).toBeVisible();
}

async function expectDeckInvestigator(page: Page, name: string) {
  await expect(
    page.getByTestId("deck-investigator-front").getByTestId("card-name"),
  ).toContainText(name);
}

async function expectDeckInNewSession(
  browser: Browser,
  baseURL: string | undefined,
  account: Awaited<ReturnType<typeof createAuthenticatedAccount>>,
  deckName: string,
  opts: { latestUpgrade?: string } = {},
) {
  const { context, page2 } = await openDeckInNewSession(
    browser,
    baseURL,
    account,
    deckName,
  );

  if (opts.latestUpgrade) {
    await expect(page2.getByTestId("latest-upgrade-summary")).toContainText(
      opts.latestUpgrade,
    );
  }

  await context.close();
}

async function openDeckInNewSession(
  browser: Browser,
  baseURL: string | undefined,
  account: Awaited<ReturnType<typeof createAuthenticatedAccount>>,
  deckName: string,
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await login(page, account.email, account.password);
  await expect(page).toHaveURL(/\/$/);
  await waitForAccountSync(page);

  const deck = page.getByTestId(`collection-deck-${deckName}`);
  await expect(deck).toBeVisible();
  await deck.getByTestId("deck-summary-title").click({ force: true });

  return { context, page2: page };
}

async function createConnectedAccount(page: Page) {
  const arkhamDbUser = await createArkhamDbUser();
  const account = await createAuthenticatedAccount(page);
  await page.goto("/");
  await waitForAccountSync(page);
  await page.goto("/settings?tab=account");
  await page.getByRole("link", { name: "Connect" }).click();
  await authorizeArkhamDbOAuth(page, arkhamDbUser);
  await expect(page).toHaveURL(/\/settings\?tab=account$/);
  await expect(page.getByTestId("connection-status")).toHaveText("Connected");
  await waitForAccountSync(page);

  return account;
}

async function syncAccount(page: Page, accountName: string) {
  await page
    .getByRole("button", {
      exact: true,
      name: accountName.charAt(0).toUpperCase(),
    })
    .click();
  await page.getByTestId("masthead-account-sync").click();
}

function waitForDeckResponse(page: Page, method: string, urlPrefix: string) {
  return page.waitForResponse(
    (response) =>
      response.url().startsWith(urlPrefix) &&
      response.request().method() === method &&
      response.ok(),
    { timeout: 120000 },
  );
}
