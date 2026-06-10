import type { Page } from "@playwright/test";

export async function login(
  page: Page,
  email: string,
  password: string,
  options: { redirect?: string } = {},
) {
  const url = options.redirect
    ? `/auth/login?redirect=${encodeURIComponent(options.redirect)}`
    : "/auth/login";

  await page.goto(url);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}
