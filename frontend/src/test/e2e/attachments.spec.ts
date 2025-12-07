import test, { expect } from "@playwright/test";
import { fillSearch } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("attachments", () => {
  test("attach a card", async ({ page }) => {
    await page.goto("/deck/create/04001");
    await page.getByTestId("create-save").click();

    await fillSearch(page, "stick to the plan");

    await page
      .getByTestId("listcard-03264")
      .getByTestId("quantity-increment")
      .click();

    await fillSearch(page, "dynamite");

    await page
      .getByTestId("listcard-01024")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-01024")
      .getByTestId("attachment-03264")
      .click();

    await expect(
      page
        .getByTestId("virtuoso-item-list")
        .getByTestId("listcard-01024")
        .getByTestId("attachment-03264"),
    ).toContainText("×1");
  });

  test("attach a card via its card modal", async ({ page }) => {
    await page.goto("/deck/create/04001");
    await page.getByTestId("create-save").click();

    await fillSearch(page, "stick to the plan");

    await page
      .getByTestId("listcard-03264")
      .getByTestId("quantity-increment")
      .click();

    await fillSearch(page, "dynamite");

    await page
      .getByTestId("listcard-01024")
      .getByTestId("listcard-title")
      .click();

    await page
      .getByTestId("card-modal-quantities-main")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("card-modal-quantities-03264")
      .getByTestId("quantity-increment")
      .click();
    await page.locator("body").press("Escape");

    await expect(
      page
        .getByTestId("virtuoso-item-list")
        .getByTestId("listcard-01024")
        .getByTestId("attachment-03264"),
    ).toContainText("×1");
  });

  test("attach a card via the attachable card modal", async ({ page }) => {
    await page.goto("/deck/create/04001");
    await page.getByTestId("create-save").click();

    await fillSearch(page, "stick to the plan");

    await page
      .getByTestId("listcard-03264")
      .getByTestId("quantity-increment")
      .click();

    await fillSearch(page, "dynamite");

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-01024")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-01024")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("listcard-03264")
      .getByTestId("listcard-title")
      .click();

    await page
      .getByTestId("card-03264")
      .getByTestId("quantity-increment")
      .click();

    await page.locator("body").press("Escape");

    await expect(
      page
        .getByTestId("virtuoso-item-list")
        .getByTestId("listcard-01024")
        .getByTestId("attachment-03264"),
    ).toContainText("×1");
  });

  test("attach multiple cards", async ({ page }) => {
    await page.goto("/deck/create/04001");
    await page.getByTestId("create-save").click();

    await fillSearch(page, "underworld market");

    await page
      .getByTestId("listcard-09077")
      .getByTestId("quantity-increment")
      .click();

    await fillSearch(page, "contraband");

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-02109")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-02109")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-02109")
      .getByTestId("attachment-09077")
      .click();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-02109")
      .getByTestId("attachment-09077")
      .click();

    await expect(
      page
        .getByTestId("virtuoso-item-list")
        .getByTestId("listcard-02109")
        .getByTestId("attachment-09077"),
    ).toContainText("×2");
  });
});
