import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { createAuthenticatedAccount, getAccountName } from "../lib/db.ts";

test("authenticated user can update account settings", async ({ page }) => {
  const account = await createAuthenticatedAccount(page);
  const updatedName = `${account.name}-updated`;

  await page.goto("/");
  await page.getByTestId("masthead-settings").click();
  await expect(page.getByTestId("tab-account")).toBeVisible();
  await page.getByTestId("tab-account").click();

  await page.locator("#profile-username").fill(updatedName);

  await page.locator("#profile-submit").click();

  await expect.poll(() => getAccountName(account.accountId)).toBe(updatedName);
});
