import { type Page, expect, test } from "@playwright/test";
import { defaultScreenshotMask, fillSearch } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

async function cardVisible(page: Page, code: string, section?: string) {
  const locator = section ? page.getByTestId(section) : page;
  const el = locator.getByTestId(`card-${code}`);
  await el.scrollIntoViewIfNeeded();
  await expect(el).toBeVisible();
}

test.describe("card view: display", () => {
  test("renders cards and relations", async ({ page }) => {
    await page.goto("/card/01001");

    await cardVisible(page, "01001");

    await cardVisible(page, "90024", "parallel");

    await cardVisible(page, "01006", "requiredCards");
    await cardVisible(page, "01007", "requiredCards");

    await cardVisible(page, "90030", "advanced");
    await cardVisible(page, "90031", "advanced");

    await cardVisible(page, "90025", "parallelCards");
    await cardVisible(page, "90026", "parallelCards");
    await cardVisible(page, "90027", "parallelCards");
    await cardVisible(page, "90028", "parallelCards");
    await cardVisible(page, "90029", "parallelCards");

    await cardVisible(page, "98005", "replacement");
    await cardVisible(page, "98006", "replacement");
  });

  test("renders customizable options", async ({ page }) => {
    await page.goto("/card/09042");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders investigator relation on restricted cards", async ({
    page,
  }) => {
    await page.goto("/card/01001");
    await page.getByTestId("card-98005").getByTestId("card-name-inner").click();

    await cardVisible(page, "98005");
    await cardVisible(page, "01001", "restrictedTo");
  });

  test("renders upgrade/bonded relations on player cards", async ({ page }) => {
    await page.goto("/card/06112");
    await cardVisible(page, "06112");
    await cardVisible(page, "06113", "bound");
    await cardVisible(page, "06236", "level");
    await cardVisible(page, "06237", "level");
    await cardVisible(page, "06238", "level");

    await page.goto("/card/06113");
    await cardVisible(page, "06112", "bonded");

    await page.goto("/card/06238");
    await cardVisible(page, "06113", "bound");
    await cardVisible(page, "06112", "level");
    await cardVisible(page, "06236", "level");
    await cardVisible(page, "06237", "level");
  });

  test("renders cards present in multiple packs", async ({ page }) => {
    await page.goto("/card/01039");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders investigators", async ({ page }) => {
    await page.goto("/card/02005");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders taboo", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("settings-taboo-set").selectOption("7");
    await page.getByTestId("settings-save").click();

    await page.goto("/card/03006");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });

    await page.goto("/card/07197");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });

    await page.goto("/card/07268");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders cards from standalone packs", async ({ page }) => {
    await page.goto("/card/60216");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders parallel investigators", async ({ page }) => {
    await page.goto("/card/02005");
    await expect(page.getByTestId("parallel")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders encounter cards with unique backside", async ({ page }) => {
    await page.goto("/card/01121a");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders acts", async ({ page }) => {
    await page.goto("/card/08526");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders agendas", async ({ page }) => {
    await page.goto("/card/01143");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders enemies", async ({ page }) => {
    await page.goto("/card/01181");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders stories", async ({ page }) => {
    await page.goto("/card/03065");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders locations with unique fronts", async ({ page }) => {
    await page.goto("/card/88010");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders locations with shroud 0", async ({ page }) => {
    await page.goto("/card/08686");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders locations with shroud null", async ({ page }) => {
    await page.goto("/card/08630");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });

  test("renders player locations", async ({ page }) => {
    await page.goto("/card/06015a");
    await expect(page.getByTestId("main")).toHaveScreenshot({
      mask: defaultScreenshotMask(page),
    });
  });
});

test.describe("card view: interactions", () => {
  test("can show investigators that can take a player card", async ({
    page,
  }) => {
    await page.goto("/card/06238");
    await page.getByTestId("usable-by").getByTestId("details-toggle").click();
    await expect(page.getByTestId("listcard-07002")).toBeVisible();
    await expect(page.getByTestId("listcard-01001")).not.toBeVisible();
  });

  test("can show cards usable by an investigator", async ({ page }) => {
    await page.goto("/card/01001");
    await page.getByTestId("usable-cards").click();
    await expect(
      page.getByRole("heading", { name: "Card pool" }),
    ).toBeVisible();

    await fillSearch(page, "deduction");

    await expect(page.getByTestId("listcard-01039")).toBeVisible();
    await expect(page.getByTestId("listcard-02150")).toBeVisible();

    await fillSearch(page, "followed");
    await expect(page.getByTestId("listcard-06114")).not.toBeVisible();
  });

  test("can show cards usable by parallel investigator", async ({ page }) => {
    await page.goto("/card/01001");
    await page.getByTestId("usable-cards-parallel").click();

    await expect(
      page.getByRole("heading", { name: "Card pool" }),
    ).toBeVisible();

    await fillSearch(page, "deduction");

    await expect(page.getByTestId("listcard-01039")).not.toBeVisible();
    await expect(page.getByTestId("listcard-02150")).not.toBeVisible();

    await fillSearch(page, "followed");
    await expect(page.getByTestId("listcard-06114")).toBeVisible();
  });
});
