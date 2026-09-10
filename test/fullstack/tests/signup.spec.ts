import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { login } from "../lib/auth.ts";
import { createAccount } from "../lib/db.ts";
import { waitForEmailVerificationUrl } from "../lib/mailcrab.ts";

const password = "SecurePassword123!";

test.describe("signup", () => {
  test("user signs up, verifies email, and logs in", async ({ page }) => {
    const suffix = randomUUID();
    const email = `e2e-${suffix}@example.com`;
    const name = `e2e-${suffix}`;

    await signup(page, { email, password });

    await expect(
      page.getByText(
        "Signed up successfully! Please check your email to verify your account. You'll choose a username after your first login.",
      ),
    ).toBeVisible();

    await login(page, email, password);
    await expect(
      page.getByText("Your account has not been verified yet."),
    ).toBeVisible();

    const verificationUrl = await waitForEmailVerificationUrl(email);
    await page.goto(verificationUrl);
    await page.getByRole("button", { name: "Verify email" }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);

    await login(page, email, password);
    await expect(page).toHaveURL(/\/auth\/signup\/complete$/);
    await page.locator("#username").fill(name);
    await page.getByRole("button", { name: "Complete your profile" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("rejects duplicate email", async ({ page }) => {
    const account = await createAccount();
    await signup(page, { email: account.email, password });

    await expect(
      page.getByText("An account is already registered for this email"),
    ).toBeVisible();
  });
});

async function signup(
  page: Page,
  options: { email: string; password: string },
) {
  await page.goto("/auth/signup");
  await page.locator("#email").fill(options.email);
  await page.locator("#password").fill(options.password);
  await page.locator("#confirm-password").fill(options.password);
  await page.getByRole("button", { name: "Sign up" }).click();
}
