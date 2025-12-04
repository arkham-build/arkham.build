import { expect, test } from "@playwright/test";
import { fillSearch, importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("settings", () => {
  test("update collection settings", async ({ page }) => {
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

    await page
      .getByTestId("listcard-02002")
      .getByTestId("listcard-title")
      .click();
    await expect(page.getByTestId("card-text").first()).toContainText(
      "Mutated. After you succeed at a skill test by 2 or more while investigating: Discover 1 clue at your location. (Limit once per round.)",
    );
    await expect(page.getByTestId("card-taboo").first()).toContainText(
      " Taboo list Mutated.",
    );
  });

  test("update list settings", async ({ page }) => {
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

  test("default environment setting applies to deck creation", async ({
    page,
  }) => {
    await page.goto("/");

    await page.goto("/deck/create");
    await fillSearch(page, "yorick");
    await page.getByTestId("create-choose-investigator").click();

    await expect(page.getByTestId("limited-card-pool-field")).toBeVisible();
    await expect(page.getByText("Revised Core Set")).not.toBeVisible();

    await page.goto("/settings");
    await page
      .getByTestId("settings-default-environment")
      .selectOption("current");
    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await page.goto("/deck/create");
    await fillSearch(page, "yorick");
    await page.getByTestId("create-choose-investigator").click();

    await expect(page.getByTestId("limited-card-pool-field")).toBeVisible();
    await expect(page.getByText("Revised Core Set")).toBeVisible();
  });

  test("rbw are limited to card pool when configured", async ({ page }) => {
    await importDeckFromFile(page, "validation/base_case.json", {
      navigate: "edit",
    });
    await page.getByTestId("editor-tab-config").click();

    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-menu-item-dwlp").click();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();
    await page.getByTestId("subtype-none").click();
    await page.getByTestId("subtype-weakness").click();

    await expect(
      page.getByTestId("virtuoso-item-list").getByTestId("listcard-01000"),
    ).toBeVisible();
    await expect(page.getByTestId("listcard-02038")).toBeVisible();
    await expect(
      page.getByTestId("virtuoso-item-list").getByTestId("listcard-02039"),
    ).toBeVisible();
    await expect(page.getByTestId("listcard-02037")).toBeVisible();

    await fillSearch(page, "Narcolepsy");
    await expect(page.getByTestId("listcard-06037")).not.toBeVisible();
  });

  test("rbw are not limited to card pool when configured", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTestId("settings-weakness-pool").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("masthead-logo").click();

    await importDeckFromFile(page, "validation/base_case.json", {
      navigate: "edit",
    });
    await page.getByTestId("editor-tab-config").click();

    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-menu-item-dwlp").click();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();
    await page.getByTestId("subtype-none").click();
    await page.getByTestId("subtype-weakness").click();

    await fillSearch(page, "Narcolepsy");
    await expect(page.getByTestId("listcard-06037")).toBeVisible();
  });

  test("rbw limit does not affect signature weaknesses", async ({ page }) => {
    await importDeckFromFile(page, "validation/base_case.json", {
      navigate: "edit",
    });
    await page.getByTestId("editor-tab-config").click();

    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-menu-item-dwlp").click();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();
    await page.getByTestId("subtype-none").click();
    await page.getByTestId("subtype-basicweakness").click();

    await expect(page.getByTestId("listcard-06017")).toBeVisible();
  });

  test("rbw limit does not affect campaign weaknesses", async ({ page }) => {
    await importDeckFromFile(page, "validation/base_case.json", {
      navigate: "edit",
    });
    await page.getByTestId("editor-tab-config").click();

    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-menu-item-dwlp").click();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();
    await page.getByTestId("subtype-none").click();
    await page.getByTestId("subtype-basicweakness").click();

    await page.getByTestId("card-type-player").click();

    await page.getByTestId("search-input").click();
    await page.getByTestId("search-input").fill("Man in the pallid mask");
    await expect(page.getByTestId("listcard-03059")).toBeVisible();
  });
});
