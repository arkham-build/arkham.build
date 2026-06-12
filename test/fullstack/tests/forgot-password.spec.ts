import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { login } from "../lib/auth.ts";
import { createAccount, createUnverifiedAccount } from "../lib/db.ts";
import {
  assertNoPasswordResetEmail,
  waitForPasswordResetUrl,
} from "../lib/mailcrab.ts";

const newPassword = "NewSecurePassword123!";
const secondNewPassword = "SecondSecurePassword123!";

test.describe("forgot password", () => {
  test("resets password", async ({ page }) => {
    const account = await createAccount();

    await submitForgotPassword(page, account.email);
    await expectForgotPasswordSuccess(page);

    const resetUrl = await waitForPasswordResetUrl(account.email);

    await resetPassword(page, resetUrl, newPassword);
    await expect(page).toHaveURL(/\/auth\/login$/);

    await login(page, account.email, account.password);
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    await login(page, account.email, newPassword);
    await expect(page).toHaveURL(/\/$/);

    await page.getByTestId("masthead-settings").click();
    await expect(page.getByTestId("tab-account")).toBeVisible();
    await page.getByTestId("tab-account").click();
    await expect(page.locator("#profile-username")).toHaveValue(account.name);
  });

  test("shows success for unknown account without sending email", async ({
    page,
  }) => {
    const email = `e2e-${randomUUID()}@example.com`;
    await submitForgotPassword(page, email);
    await expectForgotPasswordSuccess(page);
    await assertNoPasswordResetEmail(email);
  });

  test("shows success for unverified account without sending email", async ({
    page,
  }) => {
    const account = await createUnverifiedAccount();
    await submitForgotPassword(page, account.email);
    await expectForgotPasswordSuccess(page);
    await assertNoPasswordResetEmail(account.email);
  });

  test("rejects invalid token", async ({ page }) => {
    const account = await createAccount();

    await resetPassword(
      page,
      "/auth/reset-password#token=invalid-token",
      newPassword,
    );

    await expect(page.getByTestId("toast")).toContainText(
      "Password reset failed: Error: Invalid or expired password reset token",
    );

    await login(page, account.email, account.password);
    await expect(page).toHaveURL(/\/$/);
  });

  test("rejects reused token", async ({ page }) => {
    const account = await createAccount();

    await submitForgotPassword(page, account.email);
    const resetUrl = await waitForPasswordResetUrl(account.email);

    await resetPassword(page, resetUrl, newPassword);

    await expect(page).toHaveURL(/\/auth\/login$/);

    await resetPassword(page, resetUrl, secondNewPassword);

    await expect(page.getByTestId("toast")).toContainText(
      "Password reset failed: Error: Invalid or expired password reset token",
    );

    await login(page, account.email, secondNewPassword);
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    await login(page, account.email, newPassword);
    await expect(page).toHaveURL(/\/$/);
  });
});

async function submitForgotPassword(page: Page, emailOrUsername: string) {
  await page.goto("/auth/forgot-password");
  await page.locator("#emailOrUsername").fill(emailOrUsername);
  await page
    .getByRole("button", { name: "Send password reset instructions" })
    .click();
}

async function expectForgotPasswordSuccess(page: Page) {
  await expect(
    page.getByText(
      "If an account exists, you'll receive a reset link shortly.",
    ),
  ).toBeVisible();
}

async function resetPassword(page: Page, resetUrl: string, password: string) {
  await page.goto(resetUrl);
  await page.locator("#password").fill(password);
  await page.locator("#confirm-password").fill(password);
  await page.getByRole("button", { name: "Reset password" }).click();
}
