import { Page, expect, test } from "@playwright/test";
import { fillSearch } from "./actions";
import { mockApiCalls } from "./mocks";

test.describe("settings", () => {
  test("update collection settings", async ({ page }) => {
    await mockApiCalls(page);
    await page.goto("/");
    await expect(
      page.locator("div").filter({ hasText: /^Ownership$/ }),
    ).not.toBeVisible();

    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("tab-collection").click();

    await page.getByTestId("settings-show-all").click();

    await page.getByLabel("The Dunwich Legacy Investigator Expansion").click();
    await page.getByLabel("The Dunwich Legacy Campaign").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await fillSearch(page, "zoey samaras");
    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );

    await fillSearch(page, "william yorick");
    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "0 cards",
    );

    await expect(
      page
        .locator("div")
        .filter({ hasText: /^OwnershipOwned$/ })
        .first(),
    ).toBeVisible();

    await page.getByTestId("masthead-settings").click();

    await page.getByTestId("tab-collection").click();
    await page.getByTestId("settings-show-all").click();

    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await fillSearch(page, "william yorick");
    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );

    await expect(
      page.locator("div").filter({ hasText: /^Ownership$/ }),
    ).not.toBeVisible();
  });

  test("update default taboo", async ({ page }) => {
    await mockApiCalls(page);
    await page.goto("/");

    await page.getByTestId("search-input").focus();
    await page.getByTestId("search-game-text").click();

    await fillSearch(page, "Mutated");

    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "0 cards",
    );

    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("settings-taboo-set").selectOption("7");
    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await page.getByTestId("search-input").focus();
    await page.getByTestId("search-game-text").click();
    await fillSearch(page, "Mutated");

    await expect(
      page.getByRole("button", { name: "Rex Murphy" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Rex Murphy" }).click();
    await expect(page.getByTestId("card-text").first()).toContainText(
      "Mutated. After you succeed at a skill test by 2 or more while investigating: Discover 1 clue at your location. (Limit once per round.)",
    );
    await expect(page.getByTestId("card-taboo").first()).toContainText(
      " Taboo list Mutated.",
    );
  });

  async function assertSubtypeSettingApplied(page: Page) {
    await expect(page.getByTestId("subtype-none")).toBeChecked();
    await expect(page.getByTestId("subtype-basicweakness")).not.toBeChecked();
    await expect(page.getByTestId("subtype-weakness")).not.toBeChecked();

    await page
      .getByTestId("toggle-card-type")
      .getByTestId("card-type-encounter")
      .click();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();

    await expect(page.getByTestId("subtype-none")).toBeChecked();
    await expect(page.getByTestId("subtype-weakness")).toBeChecked();
  }

  test("update 'hide weaknesses' setting", async ({ page }) => {
    await mockApiCalls(page);
    await page.goto("/");

    await page.getByTestId("masthead-settings").click();
    await page.getByLabel("Hide weaknesses in player").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();

    await assertSubtypeSettingApplied(page);

    await page.reload();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();

    await assertSubtypeSettingApplied(page);
  });

  test("update list settings", async ({ page }) => {
    await mockApiCalls(page);
    await page.goto("/");
    await expect(
      page.getByTestId("virtuoso-top-item-list").getByText("Investigator"),
    ).toBeVisible();
    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("player-group-subtype").click();
    await page.getByTestId("player-group-type").click();

    await page
      .getByTestId("list-settings-player-group")
      .getByTestId("sortable-item-cost")
      .getByTestId("sortable-drag-handle")
      .hover();
    await page.mouse.down();
    await page
      .getByTestId("list-settings-player-group")
      .getByTestId("sortable-item-subtype")
      .hover();
    await page.mouse.up();

    await page.waitForTimeout(1000);
    await page
      .getByTestId("list-settings-player-group")
      .getByTestId("player-group-cost")
      .click();

    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await expect(
      page.getByTestId("virtuoso-top-item-list").getByText("No cost"),
    ).toBeVisible();
  });

  test("update 'show previews' setting", async ({ page }) => {
    await mockApiCalls(page);
    await page.goto("/");
    await fillSearch(page, "preview test card");
    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "0 cards",
    );
    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("tab-collection").click();
    await page.getByTestId("settings-show-previews").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();
    await fillSearch(page, "preview test card");
    await expect(page.getByTestId("listcard-99999")).toBeVisible();

    await expect(page.getByTestId("preview-banner")).not.toBeVisible();
  });

  test("deselect all grouping and sorting options", async ({ page }) => {
    await mockApiCalls(page);
    await page.goto("/settings");
    await page.getByTestId("player-group-subtype").click();
    await page
      .getByTestId("list-settings-player-group")
      .getByTestId("sortable-item-type")
      .click();
    await page.getByTestId("player-group-slot").click();
    await page.getByTestId("player-sort-name").click();
    await page.getByTestId("player-sort-level").click();
    await page.getByTestId("player-sort-position").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("masthead-logo").click();
    await expect(page.getByTestId("card-list-scroller")).toBeVisible();
  });

  test("changing theme in settings is only persisted when clicking save", async ({
    page,
  }) => {
    await mockApiCalls(page);
    await page.goto("/settings");
    await expect(page.locator("html")).toHaveAttribute("class", "theme-dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByTestId("settings-select-theme").selectOption("light");

    // resets after changing pages as save was not clicked
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("class", "theme-dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    page.reload();
    await expect(page.locator("html")).toHaveAttribute("class", "theme-dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // now with clicking save
    await page.goto("/settings");
    await expect(page.locator("html")).toHaveAttribute("class", "theme-dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByTestId("settings-select-theme").selectOption("light");
    await page.getByTestId("settings-save").click();

    // now it should be persistent
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("class", "theme-light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    page.reload();
    await expect(page.locator("html")).toHaveAttribute("class", "theme-light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
