import { expect, type Page } from "@playwright/test";

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

export async function logout(page: Page) {
  const accountMenu = page.getByTestId("masthead-account-menu");
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/v2/account/auth/logout" &&
      response.request().method() === "POST",
  );

  await accountMenu.click();
  await page.getByRole("button", { name: "Logout" }).click();

  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  await expect(accountMenu).toBeHidden();
}
