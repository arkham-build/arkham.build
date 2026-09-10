import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { authorizeArkhamDbOAuth, createArkhamDbUser } from "../lib/arkhamdb.ts";
import { logout } from "../lib/auth.ts";
import { createAuthenticatedAccount } from "../lib/db.ts";

const completeProfileName = () => `e2e-oauth-${randomUUID()}`;

test.describe("ArkhamDB OAuth", () => {
  test("signs up with ArkhamDB", async ({ page }) => {
    const arkhamDbUser = await createArkhamDbUser();
    const username = completeProfileName();

    await page.goto("/auth/signup");
    await page.getByRole("link", { name: "Sign up with ArkhamDB" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(page).toHaveURL(/\/auth\/signup\/complete$/);
    await page.locator("#username").fill(username);
    await page.getByRole("button", { name: "Complete your profile" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expectAuthenticatedAs(page, username);
  });

  test("logs in with ArkhamDB", async ({ page }) => {
    const arkhamDbUser = await createArkhamDbUser();
    const username = completeProfileName();

    await page.goto("/auth/signup");
    await page.getByRole("link", { name: "Sign up with ArkhamDB" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);
    await page.locator("#username").fill(username);
    await page.getByRole("button", { name: "Complete your profile" }).click();
    await expect(page).toHaveURL(/\/$/);

    await logout(page);
    await page.goto("/auth/login");
    await page.getByRole("link", { name: "Log in with ArkhamDB" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(page).toHaveURL(/\/$/);
    await expectAuthenticatedAs(page, username);
  });

  test("connects an ArkhamDB account", async ({ page }) => {
    await createAuthenticatedAccount(page);
    const arkhamDbUser = await createArkhamDbUser();

    await openAccountSettings(page);
    await page.getByRole("link", { name: "Connect" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(page).toHaveURL(/\/settings\?tab=account$/);
    await expect(page.getByTestId("connection-status")).toHaveText("Connected");
  });

  test("disconnects an ArkhamDB account", async ({ page }) => {
    await createAuthenticatedAccount(page);
    const arkhamDbUser = await createArkhamDbUser();

    await openAccountSettings(page);
    await page.getByRole("link", { name: "Connect" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(page).toHaveURL(/\/settings\?tab=account$/);
    await expect(page.getByTestId("connection-status")).toHaveText("Connected");
    await page.getByRole("button", { name: "Disconnect" }).click();

    await logout(page);
    await page.goto("/auth/login");

    await page.getByRole("link", { name: "Log in with ArkhamDB" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(
      page.getByRole("button", { name: "Complete your profile" }),
    ).toBeVisible();
  });

  test("rejects ArkhamDB accounts without decks", async ({ page }) => {
    const arkhamDbUser = await createArkhamDbUser({ createDeck: false });

    await page.goto("/auth/signup");
    await page.getByRole("link", { name: "Sign up with ArkhamDB" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(
      page.getByText(
        "Your ArkhamDB account must have at least one deck before you can continue.",
      ),
    ).toBeVisible();
  });
});

async function expectAuthenticatedAs(page: Page, name: string) {
  await openAccountSettings(page);
  await expect(page.locator("#profile-username")).toHaveValue(name);
}

async function openAccountSettings(page: Page) {
  await page.goto("/");
  await page.getByTestId("masthead-settings").click();
  await expect(page.getByTestId("tab-account")).toBeVisible();
  await page.getByTestId("tab-account").click();
}
