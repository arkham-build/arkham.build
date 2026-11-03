import { expect, type Page, test } from "@playwright/test";
import {
  reloadAndSyncAccount,
  waitForAccountSync,
} from "../lib/account-sync.ts";
import { createAuthenticatedAccount } from "../lib/db.ts";
import { apiUrl } from "../lib/env.ts";

const resources = [
  { name: "settings", path: "/v2/account/settings" },
  { name: "folders", path: "/v2/account/folders" },
  { name: "card tags", path: "/v2/account/card-tags" },
];

test.describe("account sync states", () => {
  for (const { name, path } of resources) {
    test(`failed ${name} loads set sync status to error and recover`, async ({
      page,
    }) => {
      await createSyncedAccount(page);

      await page.route(`${apiUrl}${path}`, async (route) => {
        if (route.request().method() === "GET") {
          await route.abort("failed");
          return;
        }
        await route.continue();
      });

      await page.reload();
      await expectSyncStatus(page, "error");

      await page.unrouteAll({ behavior: "ignoreErrors" });
      await reloadAndSyncAccount(page);
    });
  }

  for (const { name, path } of resources.filter((r) => r.name !== "settings")) {
    test(`a conflict while seeding empty remote ${name} is kept`, async ({
      page,
    }) => {
      // The first sync seeds the remote copy.
      await createSyncedAccount(page);

      // Pretend the remote is empty, so the app seeds it again and the server
      // rejects the write because a copy already exists.
      await page.route(`${apiUrl}${path}`, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ json: { revision: null, state: null } });
          return;
        }
        await route.continue();
      });

      const seed = page.waitForResponse(
        (response) =>
          response.url() === `${apiUrl}${path}` &&
          response.request().method() === "PUT",
      );
      await page.reload();
      expect((await seed).status()).toBe(409);

      await expectSyncStatus(page, "conflict");
    });
  }
});

async function createSyncedAccount(page: Page) {
  await createAuthenticatedAccount(page);
  await page.goto("/");
  await waitForAccountSync(page);
}

async function expectSyncStatus(page: Page, status: string) {
  await expect(
    page.getByTestId("masthead-account-sync-status"),
  ).toHaveAttribute("data-sync-status", status);
}
