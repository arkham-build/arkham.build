import test, { expect } from "@playwright/test";
import { fillSearch, importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("Limited card slots", () => {
  test("shows cards that occupy limited card slots", async ({ page }) => {
    await importDeckFromFile(
      page,
      "validation/tag_based_access_versatile.json",
      {
        navigate: "edit",
      },
    );
    await page
      .getByTestId("listcard-98010")
      .getByTestId("listcard-title")
      .click();

    await expect(page.getByTestId("limited-card-group")).toHaveCount(2);
    await expect(page.getByTestId("limited-card-stats").first()).toContainText(
      "15 / 15",
    );
    await expect(page.getByTestId("limited-card-stats").nth(1)).toContainText(
      "1 / 1",
    );
  });

  test("handles customizable cards", async ({ page }) => {
    await importDeckFromFile(
      page,
      "validation/tag_based_access_versatile.json",
      {
        navigate: "edit",
      },
    );

    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("listcard-03020")
      .getByTestId("quantity-decrement")
      .click();
    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("listcard-03020")
      .getByTestId("quantity-decrement")
      .click();

    await fillSearch(page, "alchemical distillation");

    await page
      .getByTestId("listcard-09040")
      .getByTestId("quantity-increment")
      .click();
    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-09040")
      .getByTestId("quantity-increment")
      .click();
    await expect(page.getByTestId("decklist-validation")).toBeVisible();

    await page
      .getByTestId("listcard-98010")
      .getByTestId("listcard-title")
      .click();
    await expect(
      page.getByTestId("investigator-modal").getByTestId("listcard-09040"),
    ).toBeVisible();

    await page.getByTestId("investigator-modal").press("Escape");

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-09040")
      .getByTestId("listcard-title")
      .click();
    await page.getByTestId("customization-1-xp-0").click();

    await page.getByTestId("card-modal").press("Escape");

    await expect(page.getByTestId("decklist-validation")).not.toBeVisible();

    await page
      .getByTestId("listcard-98010")
      .getByTestId("listcard-title")
      .click();
    await expect(
      page.getByTestId("investigator-modal").getByTestId("listcard-09040"),
    ).not.toBeVisible();
  });
});
