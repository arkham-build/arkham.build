import { expect, test } from "@playwright/test";
import { fillSearch } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
  await page.goto("/");
});

test.describe("filters", () => {
  test("filter via shortcuts", async ({ page }) => {
    await page
      .getByTestId("filters-type-shortcut")
      .getByRole("button", { name: "Event" })
      .click();

    await page
      .getByTestId("filters-level-shortcut")
      .getByRole("radio", { name: "Level 0" })
      .click();

    await page
      .getByTestId("filters-cost")
      .getByTestId("collapsible-trigger")
      .click();

    await page.getByLabel("Minimum").click();
    for (let i = 0; i < 12; i++) {
      await page.getByLabel("Minimum").press("ArrowRight");
    }

    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );
    await expect(page.getByTestId("listcard-60216")).toBeVisible();
  });

  test("filter factions", async ({ page }) => {
    await page.getByTestId("filters-faction-seeker").click();

    await fillSearch(page, "Practice Makes Perfect");

    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );
    await expect(page.getByTestId("listcard-06197")).toBeVisible();

    await page.getByTestId("filters-faction-guardian").click();
    await page.getByTestId("filters-faction-seeker").click();

    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "0 cards",
    );

    await page.getByTestId("filters-faction-seeker").click();
    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "1 card",
    );
  });

  test("filter subtypes", async ({ page }) => {
    await page.getByTestId("search-input").click();
    await fillSearch(page, "king in yellow");
    await expect(page.getByTestId("listcard-03011")).toBeVisible();

    await page
      .getByTestId("subtype-filter")
      .getByTestId("collapsible-trigger")
      .click();
    await page.getByTestId("subtype-weakness").click();
    await expect(page.getByTestId("listcard-03011")).not.toBeVisible();
  });

  test("filter types", async ({ page }) => {
    await page.getByTestId("card-type-encounter").click();
    await fillSearch(page, "young deep one");
    await page.getByRole("heading", { name: "Type", exact: true }).click();
    await page.getByTestId("combobox-input").fill("enemy");
    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-menu-item-enemy").click();
    await page.getByTestId("combobox-input").fill("asset");
    await page.getByTestId("combobox-menu-item-asset").click();
    await expect(page.getByTestId("listcard-01181")).toBeVisible();
    await page.getByTestId("combobox-input").fill("enemy");
    await page.getByTestId("combobox-menu-item-enemy").click();
    await expect(page.getByTestId("listcard-01181")).not.toBeVisible();
  });

  test("toggle game text", async ({ page }) => {
    await page.getByTestId("search-input").focus();
    await page.getByTestId("search-game-text").click();
    await fillSearch(page, "ashcan pete");

    await page.getByTestId("search-input").blur();

    await page.getByTestId("collection-create-deck").hover();
    await page.locator('[data-test-id="card-list-config"]').click();
    await page.getByLabel("List with card text").click();

    await expect(page.getByTestId("card-text").first()).toBeVisible();
    await expect(page.getByTestId("card-text").nth(1)).toBeVisible();

    await page.getByLabel("Scans (Grouped)").click();

    await expect(page.getByTestId("card-text").first()).not.toBeVisible();
    await expect(page.getByTestId("card-text").nth(1)).not.toBeVisible();
  });

  test("filter investigator stats shortcut", async ({ page }) => {
    await page.getByTestId("collection-create-deck").click();

    await page
      .getByTestId("filter-investigator-skills-shortcut-intellect")
      .click();

    await page
      .getByTestId("filter-investigator-skills-shortcut-agility")
      .click();

    await expect(page.getByTestId("listcard-07003")).toBeVisible();

    await page
      .getByTestId("filter-investigator-skills-shortcut-combat")
      .click();

    await expect(page.getByTestId("listcard-07003")).not.toBeVisible();
  });

  test("filter investigator stats", async ({ page }) => {
    await page.getByTestId("collection-create-deck").click();
    await page.getByRole("heading", { name: "Stats" }).click();

    await fillSearch(page, "preston");
    await expect(page.getByTestId("listcard-05003")).toBeVisible();

    for (const key of ["willpower", "intellect", "combat", "agility"]) {
      await page
        .getByTestId(`filter-investigator-skills-${key}`)
        .getByLabel("Maximum")
        .click();

      for (let i = 0; i < 5; i++) {
        await page
          .getByTestId(`filter-investigator-skills-${key}`)
          .getByLabel("Maximum")
          .press("ArrowLeft");
      }
    }

    await expect(page.getByTestId("listcard-05003")).not.toBeVisible();

    await fillSearch(page, "calvin");
    await expect(page.getByTestId("listcard-04005")).toBeVisible();
  });

  test("filter investigator health", async ({ page }) => {
    await page.getByTestId("collection-create-deck").click();
    await fillSearch(page, "skids");
    await page.getByRole("heading", { name: "Health" }).click();
    await page.getByLabel("Minimum").click();
    await expect(page.getByTestId("listcard-01003")).toBeVisible();
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await expect(page.getByTestId("listcard-01003")).not.toBeVisible();
  });

  test("filter investigator sanity", async ({ page }) => {
    await page.getByTestId("collection-create-deck").click();
    await page.getByRole("heading", { name: "Sanity" }).click();
    await fillSearch(page, "agnes");
    await page.getByLabel("Minimum").click();
    await expect(page.getByTestId("listcard-01004")).toBeVisible();
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await expect(page.getByTestId("listcard-01004")).not.toBeVisible();
  });

  test("filter investigator card access", async ({ page }) => {
    await page.getByTestId("collection-create-deck").click();
    await fillSearch(page, "mateo");
    await page.getByRole("heading", { name: "Card access" }).click();
    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-input").fill("purif");
    await page.getByTestId("combobox-menu-item-10029").click();
    await page.getByTestId("combobox-input").fill("eye of cha");
    await page.getByTestId("combobox-menu-item-07227").click();
    await page.getByTestId("combobox-input").fill("keep fa");
    await page.getByTestId("combobox-menu-item-10124").click();

    await expect(page.getByTestId("listcard-04004")).toBeVisible();

    await page.getByTestId("combobox-input").fill("dark horse");
    await page.getByTestId("combobox-menu-item-10127").click();
    await expect(page.getByTestId("listcard-04004")).not.toBeVisible();
  });

  test("toggle search name", async ({ page }) => {
    await fillSearch(page, "charge");
    await page.getByRole("heading", { name: "Asset", exact: true }).click();
    await page.getByPlaceholder("Select slots").click();
    await page.getByPlaceholder("Select slots").fill("taro");
    await page.getByTestId("combobox-menu-item-Tarot").click();
    await expect(page.getByTestId("listcard-54005")).toBeVisible();
    await page.getByTestId("search-input").focus();
    await page.getByTestId("search-game-text").click();
    await page.getByTestId("search-card-name").click();
    await expect(page.getByTestId("listcard-54005")).not.toBeVisible();
    await page.getByTestId("combobox-result-remove").click();
    await page.getByPlaceholder("Select slots").click();
    await page.getByTestId("combobox-menu-item-Hand x2").click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
  });

  test("filter level: customizable (no investigator selection)", async ({
    page,
  }) => {
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("radio", { name: "Level 0" }).click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("radio", { name: "Level 1-" }).click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
  });

  test("filter level: customizable (investigator selection)", async ({
    page,
  }) => {
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("heading", { name: "Investigator" }).click();
    await page
      .getByTestId("investigator-filter")
      .getByTestId("custom-select-control")
      .click();
    await page.getByTestId("custom-select-option-04002").click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("radio", { name: "Level 1-" }).click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("radio", { name: "Level 0" }).click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await fillSearch(page, "honed instinct");
    await expect(page.getByTestId("listcard-09061")).not.toBeVisible();
  });

  test("filter level: customizable (deck editing)", async ({ page }) => {
    await page.goto("/deck/create/04002");
    await page.getByTestId("create-save").click();
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("radio", { name: "Level 0" }).click();

    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("radio", { name: "Level 1-" }).click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
    await page.getByRole("heading", { name: "Level" }).click();
    await page.getByLabel("Minimum").click();
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await page.getByLabel("Minimum").press("ArrowRight");
    await expect(page.getByTestId("listcard-09022")).not.toBeVisible();
    await page.getByLabel("Minimum").press("ArrowRight");
    await expect(page.getByTestId("listcard-09022")).not.toBeVisible();
    await page.getByLabel("Minimum").press("ArrowLeft");

    await page
      .getByTestId("listcard-09022")
      .getByTestId("listcard-title")
      .click();
    await page.getByTestId("customization-0-xp-0").click();
    await page.getByTestId("customization-5-xp-2").press("Escape");

    await page
      .getByTestId("listcard-09022")
      .getByTestId("quantity-increment")
      .click();
    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("quantity-increment")
      .click();

    await expect(
      page.getByTestId("editor-tabs-slots").getByTestId("listcard-09022"),
    ).toBeVisible();
    await expect(
      page.getByTestId("virtuoso-item-list").getByTestId("listcard-09022"),
    ).toBeVisible();
    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-title")
      .click();
    await page.getByTestId("customization-7-xp-3").click();
    await page.getByTestId("customization-6-xp-2").click();
    await page.getByTestId("customization-5-xp-2").click();
    await page.getByTestId("customization-5-xp-2").press("Escape");

    await expect(
      page.getByTestId("virtuoso-item-list").getByTestId("listcard-09022"),
    ).toBeVisible();

    await expect(
      page.getByTestId("editor-tabs-slots").getByTestId("listcard-09022"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reset" }).click();
    await fillSearch(page, "honed instinct");
    await expect(page.getByTestId("listcard-09061")).not.toBeVisible();
  });

  test("search handles diacritics", async ({ page }) => {
    await fillSearch(page, "kohaku");
    await expect(page.getByTestId("listcard-10012")).toBeVisible();
    await fillSearch(page, "Kōhaku");
    await expect(page.getByTestId("listcard-10012")).toBeVisible();
  });

  test("filters match backsides", async ({ page }) => {
    await page.getByTestId("card-type-encounter").click();
    await fillSearch(page, "Predator or Prey");
    await expect(page.getByTestId("listcard-01121a")).toBeVisible();
    const typeFilter = page.getByTestId("filter-Type");
    await typeFilter.getByTestId("collapsible-trigger").click();
    await typeFilter.getByTestId("combobox-input").click();
    await typeFilter.getByTestId("combobox-input").fill("enemy");
    await page.getByTestId("combobox-menu-item-enemy").click();
    await expect(page.getByTestId("listcard-01121a")).toBeVisible();
    await typeFilter.getByTestId("combobox-input").fill("enemy");
    await page.getByTestId("combobox-menu-item-enemy").click();
    await typeFilter.getByTestId("combobox-input").fill("location");
    await page.getByTestId("combobox-menu-item-location").click();
    await expect(page.getByTestId("listcard-01121a")).not.toBeVisible();
  });

  test("duplicate card's packs show up in pack filter", async ({ page }) => {
    await page.getByRole("heading", { name: "Pack" }).click();
    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-input").fill("revised core");
    await expect(page.getByTestId("combobox-menu-item-rcore")).toBeVisible();
  });
});
