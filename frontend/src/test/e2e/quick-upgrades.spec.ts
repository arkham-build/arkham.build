import test, { expect } from "@playwright/test";
import {
  assertEditorDeckQuantity,
  importDeckFromFile,
  upgradeDeck,
} from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("quick upgrades", () => {
  test("direct upgrade", async ({ page }) => {
    await importDeckFromFile(page, "/quickupgrade.json", {
      navigate: "view",
    });
    await upgradeDeck(page);
    await page.getByTestId("view-edit").click();
    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("listcard-03154")
      .getByTestId("quick-upgrade")
      .click();
    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("listcard-03154")
      .getByTestId("quick-upgrade")
      .click();
    await assertEditorDeckQuantity(page, "01070", 2);
    await assertEditorDeckQuantity(page, "03154", 0, false);
  });

  test("upgrade via modal", async ({ page }) => {
    await importDeckFromFile(page, "/quickupgrade.json", {
      navigate: "view",
    });
    await upgradeDeck(page);
    await page.getByTestId("view-edit").click();
    await page
      .getByTestId("listcard-01060")
      .getByTestId("quick-upgrade")
      .click();
    await expect(page.getByTestId("quick-upgrade-modal")).toBeVisible();

    await page
      .getByTestId("card-02154")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("card-02306")
      .getByTestId("quantity-increment")
      .click();

    await page.getByTestId("quick-upgrade-modal").press("Escape");

    await assertEditorDeckQuantity(page, "02154", 1);
    await assertEditorDeckQuantity(page, "02306", 1);
    await assertEditorDeckQuantity(page, "01060", 0, false);
  });

  test("shrewd analysis, multiple targets", async ({ page }) => {
    await importDeckFromFile(page, "/quickupgrade.json", {
      navigate: "view",
    });
    await upgradeDeck(page);
    await page.getByTestId("view-edit").click();
    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("listcard-03025")
      .getByTestId("quick-upgrade")
      .click();

    await page.getByTestId("quick-upgrade-shrewd-analysis").click();
    await assertEditorDeckQuantity(page, "03025", 0, false);

    const quantities = await Promise.all(
      ["52004", "03192", "03193"].map(async (code) => {
        try {
          const text = await page
            .getByTestId("editor")
            .getByTestId(`listcard-${code}`)
            .getByTestId("quantity-value")
            .textContent({ timeout: 1000 });
          return Number.parseInt(text as string, 10);
        } catch (_) {
          return 0;
        }
      }),
    );

    const sum = quantities.reduce((acc, val) => acc + val, 0);
    expect(sum).toBe(2);
  });

  test("shrewd analysis, only one target", async ({ page }) => {
    await importDeckFromFile(page, "/quickupgrade_carolyn.json", {
      navigate: "view",
    });
    await upgradeDeck(page, 3);
    await page.getByTestId("view-edit").click();
    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("quick-upgrade")
      .click();
    await page.getByTestId("quick-upgrade-shrewd-analysis").click();
    await assertEditorDeckQuantity(page, "04231", 2);
    await assertEditorDeckQuantity(page, "04022", 0, false);
  });
});
