import { expect, type Page, test } from "@playwright/test";
import { login } from "../lib/auth.ts";
import { createAccount, createUnverifiedAccount } from "../lib/db.ts";

test.describe("login", () => {
  test("authenticates a verified account", async ({ page }) => {
    const account = await createAccount();

    await login(page, account.email, account.password);

    await expect(page).toHaveURL(/\/$/);
    await expectAuthenticatedAs(page, account.name);
  });

  test("rejects invalid password", async ({ page }) => {
    const account = await createAccount();

    await login(page, account.email, "WrongPassword123!");

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test("rejects unknown email", async ({ page }) => {
    await login(page, "unknown@example.com", "SecurePassword123!");

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test("rejects unverified account", async ({ page }) => {
    const account = await createUnverifiedAccount();

    await login(page, account.email, account.password);

    await expect(
      page.getByText("Your account has not been verified yet."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test("redirects after login", async ({ page }) => {
    const account = await createAccount();

    await login(page, account.email, account.password, {
      redirect: "/settings?tab=account",
    });

    await expect(page).toHaveURL(/\/settings\?tab=account$/);
    await expect(page.locator("#profile-username")).toHaveValue(account.name);
  });

  test("persists the session", async ({ page }) => {
    const account = await createAccount();

    await login(page, account.email, account.password);
    await expect(page).toHaveURL(/\/$/);

    const nextPage = await page.context().newPage();
    await nextPage.goto("/");
    await expectAuthenticatedAs(nextPage, account.name);
    await nextPage.close();
  });

  test("logs out", async ({ page }) => {
    const account = await createAccount();

    await login(page, account.email, account.password);
    await expect(page).toHaveURL(/\/$/);

    await openAccountMenu(page, account.name);
    await page.getByRole("button", { name: "Logout" }).click();

    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await page.goto("/settings?tab=account");
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });
});

async function expectAuthenticatedAs(page: Page, name: string) {
  await page.getByTestId("masthead-settings").click();
  await expect(page.getByTestId("tab-account")).toBeVisible();
  await page.getByTestId("tab-account").click();
  await expect(page.locator("#profile-username")).toHaveValue(name);
}

async function openAccountMenu(page: Page, name: string) {
  await page
    .getByRole("button", { name: name.charAt(0).toUpperCase(), exact: true })
    .click();
  await expect(page.getByText(`Logged in as ${name}`)).toBeVisible();
}
