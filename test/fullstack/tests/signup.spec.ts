import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { login } from "../lib/auth.ts";
import { createAccount } from "../lib/db.ts";
import { waitForEmailVerificationUrl } from "../lib/mailcrab.ts";

const password = "SecurePassword123!";

test.describe("signup", () => {
  test("user signs up, verifies email, and logs in", async ({ page }) => {
    const suffix = randomUUID();
    const name = `e2e-${suffix}`;
    const email = `e2e-${suffix}@example.com`;

    await signup(page, { email, name, password });

    await expect(
      page.getByText(
        "Signed up successfully! Please check your email to verify your account.",
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
    await expect(page).toHaveURL(/\/$/);
  });

  test("rejects duplicate email", async ({ page }) => {
    const account = await createAccount();
    const name = `e2e-${randomUUID()}`;

    await signup(page, { email: account.email, name, password });

    await expect(
      page.getByText("An account is already registered for this email"),
    ).toBeVisible();
  });
});

async function signup(
  page: Page,
  options: { email: string; name: string; password: string },
) {
  await page.goto("/auth/signup");
  await page.locator("#name").fill(options.name);
  await page.locator("#email").fill(options.email);
  await page.locator("#password").fill(options.password);
  await page.locator("#confirm-password").fill(options.password);
  await page.getByRole("button", { name: "Sign up" }).click();
}
