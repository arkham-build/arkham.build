import test, { expect } from "@playwright/test";
import { importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);

  await importDeckFromFile(page, "validation/base_case.json", {
    navigate: "edit",
  });

  await page
    .getByTestId("listcard-01087")
    .getByTestId("listcard-title")
    .click();

  await page
    .getByTestId("annotation-edit")
    .fill("Good card, upgrades into [Flashlight (2)](09122).");

  await page.getByTestId("annotation-edit").press("Escape");

  await page.waitForTimeout(500);

  await page.getByTestId("editor-save").click();
});

test.describe("annotations", () => {
  test("display annotation in editor", async ({ page }) => {
    await page.getByTestId("view-edit").click();
    await expect(
      page.getByTestId("annotation-indicator").locator("path"),
    ).toBeVisible();
    await page
      .getByTestId("listcard-01087")
      .getByTestId("listcard-title")
      .click();
    await expect(page.getByTestId("annotation-edit")).toHaveValue(
      "Good card, upgrades into [Flashlight (2)](09122).",
    );
  });

  test("display annotation in deck list", async ({ page }) => {
    await expect(
      page.getByTestId("listcard-01087").getByTestId("annotation-indicator"),
    ).toBeVisible();

    await expect(
      page.getByTestId("listcard-01074").getByTestId("annotation-indicator"),
    ).not.toBeVisible();
  });

  test("display annotation in modal", async ({ page }) => {
    await page
      .getByTestId("listcard-01087")
      .getByTestId("listcard-title")
      .click();

    await expect(
      page.getByTestId("card-modal").getByTestId("annotation"),
    ).toBeVisible();
  });

  test("display annotation in tooltip", async ({ page }) => {
    await page
      .getByTestId("listcard-01087")
      .getByTestId("listcard-title")
      .hover();

    await expect(page.getByTestId("annotation")).toBeVisible();
  });
});
