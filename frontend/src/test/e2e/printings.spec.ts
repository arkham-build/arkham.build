import test, { expect, type Page } from "@playwright/test";
import { adjustListCardQuantity, fillSearch } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

const DEDUCTION_CODES = ["01039", "01539", "60219"];

const DEDUCTION_REPRINT_CODE = "12039";

test.describe("printings", () => {
  test.describe("/browse", () => {
    test("list shows core set printing by default", async ({ page }) => {
      await page.goto("/");
      await fillSearch(page, "Deduction");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "01039");
      await expect(card(page, DEDUCTION_REPRINT_CODE)).not.toBeVisible();
    });

    test("list shows revised core printing if queried", async ({ page }) => {
      await enablePreviews(page);
      await page.goto("/");
      await fillSearch(page, "Deduction");
      await filterPack(page, "Revised Core Set");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "01539");
    });

    test("list shows starter pack printing if queried", async ({ page }) => {
      await enablePreviews(page);
      await page.goto("/");
      await fillSearch(page, "Deduction");
      await filterPack(page, "Harvey Walters");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "60219");
    });

    test("list shows reprint printing if queried", async ({ page }) => {
      await enablePreviews(page);
      await page.goto("/");
      await fillSearch(page, "Deduction");
      await filterPack(page, "Core Set 2026");

      for (const code of DEDUCTION_CODES) {
        await expect(card(page, code)).not.toBeVisible();
      }

      await expect(card(page, DEDUCTION_REPRINT_CODE)).toBeVisible();
    });

    test("card list shows reprint alongside core set printing when both exist", async ({
      page,
    }) => {
      await enablePreviews(page);
      await page.goto("/");
      await fillSearch(page, "Deduction");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "01039");
      await expect(card(page, DEDUCTION_REPRINT_CODE)).toBeVisible();
    });

    test("list applies collection settings", async ({ page }) => {
      await enablePreviews(page);
      await page.goto("/settings?tab=collection");
      await page.getByText("Harvey Walters").click();
      await page.getByTestId("settings-show-all").click();
      await page.getByTestId("settings-save").click();
      await page.goto("/");
      await fillSearch(page, "Deduction");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "01039");
      await fillSearch(page, "Studious");
      await expect(card(page, "05276")).not.toBeVisible();
    });
  });

  test.describe("editor", () => {
    test("only shows card pool packs", async ({ page }) => {
      await createDeck(page);
      await setCardPoolPack(page, "Harvey Walters", "har");
      await fillSearch(page, "Deduction");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "60219");
      await expect(card(page, "02150")).not.toBeVisible();
    });

    test("only shows the highest priority card pack", async ({ page }) => {
      await createDeck(page);
      await setCardPoolPack(page, "Harvey Walters", "har");
      await setCardPoolPack(page, "Revised Core Set", "rcore");
      await setCardPoolPack(page, "Core Set", "core");
      await fillSearch(page, "deduction");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "01039");
    });

    test("shows reprints when in card pool", async ({ page }) => {
      await enablePreviews(page);
      await createDeck(page);
      await fillSearch(page, "deduction");
      await setCardPoolPack(page, "Harvey Walters", "har");
      await expect(card(page, DEDUCTION_REPRINT_CODE)).not.toBeVisible();
      await setCardPoolPack(page, "Core Set 2026", "core_2026");
      await assertDuplicateVisible(page, DEDUCTION_CODES, "60219");
      await expect(card(page, DEDUCTION_REPRINT_CODE)).toBeVisible();
    });

    test("always prefer cards that are in deck", async ({ page }) => {
      await createDeck(page);
      await fillSearch(page, "deduction");
      await adjustListCardQuantity(page, "02150", "increment");
      await setCardPoolPack(page, "Harvey Walters", "har");
      await expect(card(page, "02150")).toBeVisible();
      await setCardPoolPack(page, "Harvey Walters", "har");
      await setCardPoolPack(page, "Revised Core Set", "rcore");
      await adjustListCardQuantity(page, "01539", "increment");
      await setCardPoolPack(page, "Revised Core Set", "rcore");
      await setCardPoolPack(page, "Harvey Walters", "har");
      await expect(card(page, "01539")).toBeVisible();
    });
  });
});

function card(page: Page, code: string) {
  return page.getByTestId(`listcard-${code}`);
}

async function assertDuplicateVisible(
  page: Page,
  codes: string[],
  targetCode: string,
) {
  for (const code of codes) {
    if (code === targetCode) {
      await expect(card(page, code)).toBeVisible();
    } else {
      await expect(card(page, code)).not.toBeVisible();
    }
  }
}

async function filterPack(page: Page, packName: string) {
  await page
    .getByTestId("filter-Pack")
    .getByTestId("collapsible-trigger")
    .click();
  await page.getByTestId("combobox-input").fill(packName);
  await page.getByTestId("combobox-input").press("Enter");
}

async function enablePreviews(page: Page) {
  await page.goto("/settings?tab=collection");
  await page.getByTestId("settings-show-previews").check();
  await page.getByTestId("settings-save").click();
  await page.goto("/");
}

async function createDeck(page: Page) {
  await page.goto("/deck/create/01001");
  await page.getByTestId("create-save").click();
}

async function setCardPoolPack(page: Page, packName: string, packCode: string) {
  await page.getByTestId("editor-tab-config").click();
  await page.getByTestId("combobox-input").click();
  await page.getByTestId("combobox-input").fill(packName);
  await page.getByTestId(`combobox-menu-item-${packCode}`).click();
}
