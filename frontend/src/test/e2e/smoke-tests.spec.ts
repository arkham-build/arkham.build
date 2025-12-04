import { expect, type Page, test } from "@playwright/test";
import {
  adjustDeckCardQuantity,
  assertEditorDeckQuantity,
  fillSearch,
  importDeckFromFile,
} from "./actions";

async function checkDeckVisible(page: Page) {
  const deckNode = page.getByTestId("collection-deck");
  await expect(deckNode).toBeVisible();
  expect(await deckNode.count()).toBe(1);
}

test.describe("smoke tests", () => {
  test("card list loads", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("listcard-title").first()).toBeVisible();

    await fillSearch(page, "deduction");

    await expect(page.getByTestId("listcard-title").first()).toContainText(
      "Deduction",
    );
  });

  test("decks persist past a reload", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/");

    await importDeckFromFile(page, "validation/base_case.json");
    await checkDeckVisible(page);

    await page.reload();
    await checkDeckVisible(page);
  });

  test(
    "deck edits persist past a reload",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/");

      await importDeckFromFile(page, "validation/base_case.json", {
        navigate: "edit",
      });

      await adjustDeckCardQuantity(page, "01087", "decrement");
      await adjustDeckCardQuantity(page, "01087", "decrement");

      await assertEditorDeckQuantity(page, "01087", 0, false);

      await page.reload();
      await assertEditorDeckQuantity(page, "01087", 0, false);
    },
  );

  test(
    "decks are synced across tabs",
    { tag: "@smoke" },
    async ({ page, context }) => {
      await page.goto("/");

      const page2 = await context.newPage();
      await page2.goto("/");

      await page.bringToFront();
      await importDeckFromFile(page, "validation/base_case.json");
      await checkDeckVisible(page);

      await page2.bringToFront();
      await checkDeckVisible(page2);
    },
  );

  test("ctrl+s saved a deck", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/");

    await importDeckFromFile(page, "validation/base_case.json", {
      navigate: "edit",
    });

    await page.waitForTimeout(300);

    await page.keyboard.press("Control+s");
    await expect(page.getByTestId("view-edit")).toBeVisible();
  });

  test(
    "back button goes back to previous page",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/");

      await importDeckFromFile(page, "validation/base_case.json", {
        navigate: "view",
      });

      await page.getByTestId("masthead-settings").click();
      await page.getByTestId("tab-collection").click();
      await page.getByRole("navigation").getByRole("button").click();
      await page.getByTestId("masthead-about").click();
      await page.getByRole("button", { name: "Back" }).click();
      await page.getByTestId("settings-back").click();
      expect(page.url()).toContain("/deck/view/");
    },
  );

  test(
    "back button does not go back to previous tab",
    { tag: "@smoke" },
    async ({ baseURL, page }) => {
      await page.goto("/settings");
      await page.getByTestId("settings-back").click();
      expect(page.url()).toBe(`${baseURL}/`);
    },
  );

  test(
    "lists are reset between navigation",
    { tag: "@smoke" },
    async ({ page }) => {
      await importDeckFromFile(page, "validation/base_case.json", {
        navigate: "edit",
      });
      await page.getByTestId("card-type-player").click();
      await page.getByTestId("masthead-logo").click();
      await page.getByTestId("collection-deck").click();
      await page.getByTestId("view-edit").click();
      await expect(
        page.getByTestId("virtuoso-top-item-list").getByText("Asset"),
      ).toBeVisible();
      await expect(
        page.getByTestId("virtuoso-top-item-list").getByText("Hand"),
      ).toBeVisible();
    },
  );
});
