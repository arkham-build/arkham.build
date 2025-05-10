import test, { type Page, expect } from "@playwright/test";
import {
  adjustDeckCardQuantity,
  adjustListCardQuantity,
  defaultScreenshotMask,
  fillSearch,
  importDeck,
  importDeckFromFile,
  upgradeDeck,
} from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

async function importStandardDeck(page: Page) {
  await importDeck(page);
  const deckNode = page.getByTestId("collection-deck");
  await deckNode.click();
  await expect(page).toHaveURL(/\/deck\/view/);
}

async function clearDeckDescription(page: Page) {
  await page.getByTestId("editor-notes").click();
  await page.getByTestId("editor-description").press("ControlOrMeta+a");
  await page.getByTestId("editor-description").fill("");
  await page.waitForTimeout(300);
}

test.describe("upgrades: interactions", () => {
  test("upgrade a deck", async ({ page }) => {
    await importStandardDeck(page);
    await upgradeDeck(page);
  });

  test("upgrade cards", async ({ page }) => {
    await importStandardDeck(page);
    await upgradeDeck(page);
    await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
      "0 of 5 XP spent",
    );

    await page.getByTestId("view-edit").click();

    await adjustListCardQuantity(page, "07159", "increment");
    await adjustListCardQuantity(page, "07159", "increment");

    await adjustDeckCardQuantity(page, "07117", "decrement");
    await adjustDeckCardQuantity(page, "07117", "decrement");

    await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
      "4 of 5 XP spent",
    );

    await page
      .getByTestId("latest-upgrade")
      .getByTestId("collapsible-trigger")
      .click();

    await expect(
      page.getByTestId("latest-upgrade").getByTestId("listcard-07159"),
    ).toBeVisible();

    await expect(
      page.getByTestId("latest-upgrade").getByTestId("listcard-07117"),
    ).toBeVisible();

    await page.getByTestId("editor-save").click();

    await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
      "4 of 5 XP spent",
    );
  });

  test("adjust upgrade xp", async ({ page }) => {
    await importStandardDeck(page);
    await upgradeDeck(page);
    await page.getByTestId("view-edit").click();
    await page.getByTestId("latest-upgrade-xp-increment").click();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
      "0 of 6 XP spent (+1)",
    );
    await page.getByTestId("view-edit").click();
    await page.getByTestId("latest-upgrade-xp-decrement").dblclick();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
      "0 of 4 XP spent (-1)",
    );
  });

  test("exile cards", async ({ page }) => {
    await importDeckFromFile(page, "./upgrades/exile_base_1.json", {
      navigate: "view",
    });
    await page.getByTestId("view-upgrade").click();
    await page.getByTestId("upgrade-xp").click();
    await page.getByTestId("upgrade-xp").fill("5");

    await page
      .getByTestId("upgrade-modal")
      .getByTestId("listcard-60520")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("upgrade-modal")
      .getByTestId("listcard-60520")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("upgrade-modal")
      .getByTestId("listcard-60521")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("upgrade-modal")
      .getByTestId("listcard-60521")
      .getByTestId("quantity-increment")
      .click();

    await page.getByTestId("upgrade-save-close").click();
    await page.getByTestId("latest-upgrade").click();
    await expect(page.getByTestId("listcard-60520")).toBeVisible();
    await expect(page.getByTestId("listcard-60521")).toBeVisible();
    await page.getByTestId("view-edit").click();
    await page.getByTestId("latest-upgrade-exile").click();
    await page.getByTestId("latest-upgrade-exile-60520-add").click();
    await page.getByTestId("latest-upgrade-exile-60521-add").click();

    await expect(
      page.getByTestId("editor-tabs-slots").getByTestId("listcard-60520"),
    ).toBeVisible();

    await expect(
      page.getByTestId("editor-tabs-slots").getByTestId("listcard-60521"),
    ).toBeVisible();

    await page.getByTestId("editor-save").click();
    await page.getByTestId("tab-history").click();

    await page.waitForTimeout(5000);
    await expect(page.getByTestId("history")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });
});

test.describe("upgrades: views", () => {
  test("shows latest upgrade", async ({ page }) => {
    await importStandardDeck(page);
    await upgradeDeck(page);

    await page.getByTestId("view-edit").click();

    await adjustListCardQuantity(page, "07159", "increment");
    await adjustListCardQuantity(page, "07159", "increment");

    await adjustDeckCardQuantity(page, "07117", "decrement");
    await adjustDeckCardQuantity(page, "07117", "decrement");

    await page.getByTestId("editor-save").click();

    await page.getByTestId("tab-history").click();

    await expect(page.getByTestId("history")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("shows older deck history", async ({ page }) => {
    await importStandardDeck(page);
    await upgradeDeck(page);

    await page.getByTestId("view-edit").click();

    await adjustListCardQuantity(page, "07159", "increment");
    await adjustListCardQuantity(page, "07159", "increment");

    await adjustDeckCardQuantity(page, "07117", "decrement");
    await adjustDeckCardQuantity(page, "07117", "decrement");

    await page.getByTestId("editor-save").click();

    await upgradeDeck(page);

    await page.getByTestId("view-edit").click();

    await adjustListCardQuantity(page, "08067", "increment");
    await adjustListCardQuantity(page, "08067", "increment");

    await adjustDeckCardQuantity(page, "06117", "decrement");
    await adjustDeckCardQuantity(page, "10101", "decrement");

    await clearDeckDescription(page);

    await page.getByTestId("editor-save").click();
    await page.getByTestId("tab-history").click();

    await page.waitForTimeout(5000);
    await expect(page.getByTestId("history")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("show customization in history", async ({ page }) => {
    await importStandardDeck(page);
    await upgradeDeck(page);
    await page.getByTestId("view-edit").click();

    await fillSearch(page, "living ink");

    await adjustListCardQuantity(page, "09079", "increment");
    await adjustListCardQuantity(page, "09079", "increment");

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-09079")
      .getByTestId("listcard-title")
      .click();

    await page
      .getByTestId("customization-0")
      .getByTestId("combobox-input")
      .click();
    await page.getByText("Willpower").click();
    await page.getByTestId("customization-1-xp-0").click();
    await page.getByTestId("customization-1-xp-0").press("Escape");

    await page.getByTestId("editor-save").click();
    await page.getByTestId("tab-history").click();
    await page.waitForTimeout(5000);
    await expect(page.getByTestId("history")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("transformed investigator", async ({ page }) => {
    await importDeckFromFile(page, "ythian.json", {
      navigate: "view",
    });

    await page.getByTestId("view-upgrade").click();
    await page.getByTestId("upgrade-xp").fill("2");
    await page.getByTestId("upgrade-xp").click();
    await page.getByTestId("quantity-increment").click();
    await page.getByTestId("quantity-increment").click();
    await page.getByTestId("upgrade-save-close").click();
    await page.getByTestId("view-edit").click();
    await page.getByTestId("latest-upgrade-exile").click();
    await expect(
      page.getByTestId("latest-upgrade-exile-02115-add"),
    ).toBeDisabled();
  });

  test("charon's obol", async ({ page }) => {
    await importDeckFromFile(page, "./upgrades/obol_base.json", {
      navigate: "view",
    });

    await page.getByTestId("view-upgrade").click();
    await page.getByTestId("upgrade-xp").fill("1");
    await page.getByTestId("upgrade-save-close").click();
    await page.getByTestId("tab-history").click();

    await expect(
      page.getByTestId("history").getByRole("paragraph"),
    ).toContainText("XP available: 3 (spent: 0)");
  });

  test("the great work", async ({ page }) => {
    await importDeckFromFile(page, "./upgrades/the_great_work_base.json", {
      navigate: "view",
    });

    await page.getByTestId("view-upgrade").click();
    await page.getByTestId("upgrade-xp").fill("2");
    await page.getByTestId("upgrade-save-close").click();
    await page.getByTestId("tab-history").click();
    await expect(
      page.getByTestId("history").getByRole("paragraph"),
    ).toContainText("XP available: 3 (spent: 0)");

    await page.getByTestId("view-upgrade").click();
    await page.getByTestId("upgrade-xp").fill("0");
    await page.getByText("I was usurped by the").click();
    await page.getByTestId("upgrade-save-close").click();
    await page.getByTestId("tab-history").click();

    await page.waitForTimeout(5000);
    await expect(page.getByTestId("history")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });
});
