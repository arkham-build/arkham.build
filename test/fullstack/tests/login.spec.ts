import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { createAccount } from "../support/db.ts";

test("login", async ({ page }) => {
  const account = await createAccount();

  await page.goto("/auth/login");
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.getByTestId("masthead-settings").click();
  await expect(page.getByTestId("tab-account")).toBeVisible();
  await page.getByTestId("tab-account").click();
  await expect(page.locator("#profile-username")).toHaveValue(account.name);
});
