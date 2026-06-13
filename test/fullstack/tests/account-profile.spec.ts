import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { login } from "../lib/auth.ts";
import {
  accountExists,
  createAuthenticatedAccount,
  getAccountName,
} from "../lib/db.ts";
import { waitForEmailVerificationUrl } from "../lib/mailcrab.ts";

const newPassword = "NewSecurePassword123!";

test.describe("account settings", () => {
  test("authenticated user can update profile settings", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);
    const updatedName = `${account.name}-updated`;

    await openAccountSettings(page);

    await page.locator("#profile-username").fill(updatedName);

    await page.locator("#profile-submit").click();

    await expect
      .poll(() => getAccountName(account.accountId))
      .toBe(updatedName);
  });

  test("user updates their email and verifies the change", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);
    const updatedEmail = `e2e-${randomUUID()}@example.com`;

    await openAccountSettings(page);
    await updateCredentials(page, {
      currentPassword: account.password,
      newEmail: updatedEmail,
    });

    await expect(page.getByText(updatedEmail, { exact: true })).toBeVisible();
    await expect(page.getByText("Pending verification")).toBeVisible();

    const verificationUrl = await waitForEmailVerificationUrl(updatedEmail);
    await page.goto(verificationUrl);
    await page.getByRole("button", { name: "Verify email" }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);

    await login(page, account.email, account.password);
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    await login(page, updatedEmail, account.password);
    await expect(page).toHaveURL(/\/$/);
  });

  test("user updates their password", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);

    await openAccountSettings(page);
    await updateCredentials(page, {
      currentPassword: account.password,
      newPassword,
    });

    await expect(page.locator("#account-current-password")).toHaveValue("");
    await expect(page.locator("#account-new-password")).toHaveValue("");

    await page.context().clearCookies();

    await login(page, account.email, account.password);
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    await login(page, account.email, newPassword);
    await expect(page).toHaveURL(/\/$/);
  });

  test("user updates email and cancels verification", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);
    const updatedEmail = `e2e-${randomUUID()}@example.com`;

    await openAccountSettings(page);
    await updateCredentials(page, {
      currentPassword: account.password,
      newEmail: updatedEmail,
    });

    await expect(page.getByText(updatedEmail, { exact: true })).toBeVisible();
    const verificationUrl = await waitForEmailVerificationUrl(updatedEmail);

    await page
      .getByRole("button", { name: "Cancel email verification" })
      .click();

    await expect(page.getByText(updatedEmail, { exact: true })).toBeHidden();

    await page.goto(verificationUrl);
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(
      page.getByText("Invalid or expired verification token"),
    ).toBeVisible();

    await page.context().clearCookies();

    await login(page, account.email, account.password);
    await expect(page).toHaveURL(/\/$/);
  });

  test("user deletes their account", async ({ page }) => {
    const account = await createAuthenticatedAccount(page);

    await openAccountSettings(page);
    await page.getByText("Danger zone", { exact: true }).click();

    const deleteButton = page.getByRole("button", { name: "Delete account" });
    await expect(deleteButton).toBeDisabled();

    await page.locator("#delete-account-confirmation").fill(account.name);
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => accountExists(account.accountId)).toBe(false);

    await login(page, account.email, account.password);
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });
});

async function openAccountSettings(page: Page) {
  await page.goto("/");
  await page.getByTestId("masthead-settings").click();
  await expect(page.getByTestId("tab-account")).toBeVisible();
  await page.getByTestId("tab-account").click();
}

async function updateCredentials(
  page: Page,
  options: {
    currentPassword: string;
    newEmail?: string;
    newPassword?: string;
  },
) {
  await page.locator("#account-current-password").fill(options.currentPassword);

  if (options.newEmail) {
    await page.locator("#account-new-email").fill(options.newEmail);
  }

  if (options.newPassword) {
    await page.locator("#account-new-password").fill(options.newPassword);
  }

  await page.getByRole("button", { name: "Update credentials" }).click();
}
