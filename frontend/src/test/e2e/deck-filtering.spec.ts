import { expect, test } from "@playwright/test";
import { importDeck } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("deck filtering", () => {
  test("filtering works properly", async ({ page }) => {
    await expect(page.getByTestId("deck-filters-container")).not.toBeVisible();
    await importDeck(page);
    await expect(page.getByTestId("collection-deck")).toHaveCount(1);
    await expect(page.getByTestId("deck-filters-container")).not.toBeVisible();

    await page.goto("deck/create/01001");
    await page.getByTestId("create-title").fill("GUNS GUNS GUNS");
    await page.getByTestId("create-save").click();
    await page.goto("/");

    // Only show filters if there are enough decks for filters to be meaningful
    await expect(page.getByTestId("deck-filters-container")).toBeVisible();
    await expect(page.getByTestId("deck-filters-expanded")).not.toBeVisible();

    // Deck title search
    await page.getByTestId("deck-search-input").fill("blurse");
    await expect(page.getByTestId("collection-deck")).toHaveCount(1);

    // Investigator name
    await page.getByTestId("deck-search-input").fill("roland");
    await expect(page.getByTestId("collection-deck")).toHaveCount(1);

    // Expands additional filters
    await page.getByTestId("expand-deck-filters").click();
    await expect(page.getByTestId("deck-filters-expanded")).toBeVisible();

    // Only show factions for decks in collection
    await expect(
      page
        .getByTestId("deck-filters-expanded")
        .getByTestId("filters-faction")
        .first()
        .getByRole("button"),
    ).toHaveCount(2);

    // Faction filtering
    await page
      .getByTestId("deck-filters-expanded")
      .getByTestId("filters-faction-mystic")
      .first()
      .click();
    await expect(page.getByTestId("collection-deck")).toHaveCount(0);
    await page
      .getByTestId("deck-filters-expanded")
      .getByTestId("filters-faction-mystic")
      .first()
      .click();
    await page
      .getByTestId("deck-filters-expanded")
      .getByTestId("filters-faction-guardian")
      .first()
      .click();
    await expect(page.getByTestId("collection-deck")).toHaveCount(1);

    await page.getByTestId("deck-search-input").clear();
    await page
      .getByTestId("deck-filters-expanded")
      .getByTestId("filters-faction-guardian")
      .first()
      .click();

    await page.getByTestId("deck-tags-filter").click();

    await page
      .getByTestId("deck-tags-filter")
      .getByTestId("combobox-input")
      .click();

    await page
      .getByTestId("deck-tags-filter")
      .getByTestId("combobox-input")
      .fill("theme");
    await page.getByTestId("combobox-menu-item-theme").click();
    await expect(page.getByTestId("collection-deck")).toHaveCount(1);
  });
});
