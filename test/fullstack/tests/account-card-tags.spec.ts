import { type Browser, expect, type Page, test } from "@playwright/test";
import { waitForAccountSync } from "../lib/account-sync.ts";
import { login } from "../lib/auth.ts";
import { createAuthenticatedAccount, type TestAccount } from "../lib/db.ts";
import { apiUrl } from "../lib/env.ts";

const CARD_CODE = "01020";

test.describe("account card tags", () => {
  test("create a tag and sync it", async ({ baseURL, browser, page }) => {
    const account = await createAuthenticatedAccount(page);
    const tagName = "Synced Tag";

    await openCardAndSync(page);
    await createTag(page, tagName);
    await waitForAccountSync(page);

    const { context, page2 } = await openCardInNewSession(
      browser,
      baseURL,
      account,
    );
    await expectTagVisible(page2, tagName);
    await context.close();
  });

  test("delete a tag and sync it", async ({ baseURL, browser, page }) => {
    const account = await createAuthenticatedAccount(page);
    const tagName = "Deleted Tag";

    await openCardAndSync(page);
    await createTag(page, tagName);
    await waitForAccountSync(page);
    await deleteTag(page);
    await waitForAccountSync(page);

    const { context, page2 } = await openCardInNewSession(
      browser,
      baseURL,
      account,
    );
    await expectTagHidden(page2, tagName);
    await context.close();
  });

  test("rename a tag and sync it", async ({ baseURL, browser, page }) => {
    const account = await createAuthenticatedAccount(page);
    const tagName = "Original Tag";
    const renamedTagName = "Renamed Tag";

    await openCardAndSync(page);
    await createTag(page, tagName);
    await waitForAccountSync(page);
    await renameTag(page, renamedTagName);
    await waitForAccountSync(page);

    const { context, page2 } = await openCardInNewSession(
      browser,
      baseURL,
      account,
    );
    await expectTagHidden(page2, tagName);
    await expectTagVisible(page2, renamedTagName);
    await context.close();
  });
});

async function openCardAndSync(page: Page) {
  await page.goto(`/card/${CARD_CODE}`);
  await waitForAccountSync(page);
}

function cardTags(page: Page) {
  return page.getByTestId(`card-tags-${CARD_CODE}`);
}

async function createTag(page: Page, tagName: string) {
  const response = page.waitForResponse(isCardTagsSaveResponse);
  await cardTags(page).getByTestId("combobox-input").click();
  await cardTags(page).getByTestId("combobox-input").fill(tagName);
  await page.getByTestId(`combobox-menu-item-create:${tagName}`).click();
  await response;
  await expectTagVisible(page, tagName);
}

async function deleteTag(page: Page) {
  const response = page.waitForResponse(isCardTagsSaveResponse);
  await page.getByLabel("Manage tags").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await response;
}

async function renameTag(page: Page, name: string) {
  const response = page.waitForResponse(isCardTagsSaveResponse);
  await page.getByLabel("Manage tags").click();
  await page.getByLabel("Tag name").fill(name);
  await page.getByRole("button", { name: "Update tag" }).click();
  await response;
  await expectTagVisible(page, name);
}

async function openCardInNewSession(
  browser: Browser,
  baseURL: string | undefined,
  account: TestAccount,
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await login(page, account.email, account.password);
  await expect(page).toHaveURL(/\/$/);
  await openCardAndSync(page);
  return { context, page2: page };
}

async function expectTagVisible(page: Page, tagName: string) {
  await expect(
    cardTags(page).getByText(tagName, { exact: true }),
  ).toBeVisible();
}

async function expectTagHidden(page: Page, tagName: string) {
  await expect(
    cardTags(page).getByText(tagName, { exact: true }),
  ).not.toBeVisible();
}

function isCardTagsSaveResponse(response: {
  url(): string;
  request(): { method(): string };
}) {
  return (
    response.url() === `${apiUrl}/v2/account/card-tags` &&
    response.request().method() === "PUT"
  );
}
