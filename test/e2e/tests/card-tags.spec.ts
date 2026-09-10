import { expect, type Page, test } from "@playwright/test";
import { fillSearch } from "./actions";
import { mockApiCalls } from "./mocks";

const CARD_CODE = "01020";
const TAG_NAME = "E2E Tag";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("card tags", () => {
  test("tag a card", async ({ page }) => {
    await openCard(page);
    await createTag(page, TAG_NAME);

    await expect(
      cardTags(page).getByText(TAG_NAME, { exact: true }),
    ).toBeVisible();
  });

  test("untag a card", async ({ page }) => {
    await openCard(page);
    await createTag(page, TAG_NAME);

    await cardTags(page).getByTestId("combobox-result-remove").click();

    await expect(
      cardTags(page).getByText(TAG_NAME, { exact: true }),
    ).not.toBeVisible();
  });

  test("select a created tag after untagging a card", async ({ page }) => {
    await openCard(page);
    await createTag(page, TAG_NAME);
    await cardTags(page).getByTestId("combobox-result-remove").click();
    await expect(
      cardTags(page).getByText(TAG_NAME, { exact: true }),
    ).not.toBeVisible();

    await cardTags(page).getByTestId("combobox-input").click();
    await cardTags(page).getByTestId("combobox-input").fill(TAG_NAME);

    await expect(
      page.getByTestId(`combobox-menu-item-create:${TAG_NAME}`),
    ).not.toBeVisible();
    await page
      .locator('[data-testid^="combobox-menu-item-"]')
      .filter({ hasText: TAG_NAME })
      .click();

    await expect(
      cardTags(page).getByText(TAG_NAME, { exact: true }),
    ).toBeVisible();
  });

  test("favorite a card", async ({ page }) => {
    await openCard(page);

    await toggleFavorite(page);

    await expectFavoriteSelected(page, true);
    await expect(
      cardTags(page).getByText("Favorite", { exact: true }),
    ).not.toBeVisible();
  });

  test("unfavorite a card", async ({ page }) => {
    await openCard(page);
    await toggleFavorite(page);

    await toggleFavorite(page);

    await expectFavoriteSelected(page, false);
  });

  test("filter tag", async ({ page }) => {
    await openCard(page);
    await createTag(page, TAG_NAME);
    await goToBrowse(page);
    await fillSearch(page, "machete");

    await openTagsFilter(page);
    await page
      .getByTestId("filter-Card tags")
      .getByTestId("combobox-input")
      .click();
    await page
      .getByTestId("filter-Card tags")
      .getByTestId("combobox-input")
      .fill(TAG_NAME);
    await page
      .locator('[data-testid^="combobox-menu-item-"]')
      .filter({ hasText: TAG_NAME })
      .click();

    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );
    await expect(page.getByTestId(`listcard-${CARD_CODE}`)).toBeVisible();
  });

  test("filter favorite shortcut", async ({ page }) => {
    await openCard(page);
    await toggleFavorite(page);
    await expectFavoriteSelected(page, true);
    await goToBrowse(page);
    await fillSearch(page, "machete");

    await openTagsFilter(page);
    await page.getByRole("button", { name: "Favorites" }).click();

    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );
    await expect(page.getByTestId(`listcard-${CARD_CODE}`)).toBeVisible();
  });
});

async function openCard(page: Page) {
  await page.goto(`/card/${CARD_CODE}`);
}

function cardTags(page: Page) {
  return page.getByTestId(`card-tags-${CARD_CODE}`);
}

async function createTag(page: Page, tagName: string) {
  await cardTags(page).getByTestId("combobox-input").click();
  await cardTags(page).getByTestId("combobox-input").fill(tagName);
  await page.getByTestId(`combobox-menu-item-create:${tagName}`).click();
  await expect(
    cardTags(page).getByText(tagName, { exact: true }),
  ).toBeVisible();
}

async function toggleFavorite(page: Page) {
  await favoriteButton(page).click();
}

function favoriteButton(page: Page) {
  return page.getByRole("button", { name: "Favorite" });
}

async function expectFavoriteSelected(page: Page, selected: boolean) {
  await expect(favoriteButton(page)).toHaveAttribute(
    "aria-pressed",
    String(selected),
  );
}

async function goToBrowse(page: Page) {
  await page.getByTestId("masthead-browse").click();
  await expect(page).toHaveURL(/\/browse/);
}

async function openTagsFilter(page: Page) {
  await page
    .getByTestId("filter-Card tags")
    .getByTestId("collapsible-trigger")
    .click();
}
