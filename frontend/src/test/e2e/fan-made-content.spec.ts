import { expect, type Page, test } from "@playwright/test";
import {
  fillSearch,
  importPackFromFile,
  openUrlInNewContext,
  shareDeck,
  unshareDeck,
} from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

test.describe("fan-made content", () => {
  test("import pack from file", async ({ page }) => {
    await page.goto("/settings?tab=fan-made-content");
    await importPackFromFile(page, "fan_made_investigator_project.json");
    await expect(
      page.getByTestId("collection").getByTestId("collection-project-title"),
    ).toContainText("Ordinary Citizens");
  });

  test("import pack from URL", async ({ page }) => {
    await page.goto("/settings?tab=fan-made-content");
    await page.getByTestId("collection-import-url").click();

    await page
      .getByTestId("collection-import-url-input")
      .fill("https://fan-made-project-mock.example.com");

    await page.getByTestId("collection-import-url-submit").click();
    await expect(
      page.getByTestId("collection").getByTestId("collection-project-title"),
    ).toContainText("Ordinary Citizens");
  });

  test("remove pack", async ({ page }) => {
    await page.goto("/settings?tab=fan-made-content");
    await importPackFromFile(page, "fan_made_investigator_project.json");
    await page.getByTestId("collection-project-uninstall").click();
    await expect(page.getByTestId("collection-placeholder")).toBeVisible();
  });

  test("view cards in pack", async ({ page }) => {
    await page.goto("/settings?tab=fan-made-content");
    await importPackFromFile(page, "fan_made_investigator_project.json");
    await page.getByTestId("collection-project-view-cards").click();
    await expect(
      page.getByRole("img", {
        name: "Scan of a33f6beb-915c-428c-8891-df292ddec98a",
      }),
    ).toBeVisible();
  });

  test("a fan-made-content filter is shown once content is installed", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("filter-fan-made-content")).not.toBeVisible();
    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("tab-fan-made").click();
    await importPackFromFile(page, "fan_made_investigator_project.json");
    await page.getByTestId("masthead-logo").click();
    await expect(page.getByTestId("filter-fan-made-content")).toBeVisible();
  });

  test("fan-made content filter default setting is applied", async ({
    page,
  }) => {
    await page.goto("/settings?tab=fan-made-content");
    await importPackFromFile(page, "fan_made_investigator_project.json");
    await page
      .getByLabel("Card lists", { exact: true })
      .selectOption("fan-made");
    await page.getByTestId("settings-save").click();
    await page.getByTestId("masthead-logo").click();
    await fillSearch(page, "Lucia Deveraux");
    await expect(
      page.getByTestId("listcard-a33f6beb-915c-428c-8891-df292ddec98a"),
    ).toBeVisible();
    await fillSearch(page, "Roland Banks");
    await expect(page.getByTestId("listcard-01001")).not.toBeVisible();
  });

  test("add fan-made card to deck", async ({ page }) => {
    await createDeckWithFanMadeCard(page);
    await expect(
      page.getByTestId("listcard-22be57b3-4e9f-4ecf-8f95-adf3edcf239d"),
    ).toBeVisible();
  });

  test("create deck with fan-made investigator", async ({ page }) => {
    await page.goto("/settings?tab=fan-made-content");
    await importPackFromFile(page, "fan_made_investigator_project.json");
    await page.getByTestId("masthead-logo").click();
    await page.getByTestId("collection-create-deck").click();
    await fillSearch(page, "Lucia Deveraux");
    await page.getByTestId("create-choose-investigator").click();
    await page.getByTestId("create-save").click();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("card-name")).toContainText("Lucia Deveraux");
    await expect(
      page.getByTestId("listcard-38fa4050-d63d-4870-91cd-a076d642f192"),
    ).toBeVisible();
  });

  test("share deck with fan-made cards", async ({ page }) => {
    await createDeckWithFanMadeCard(page);
    await shareDeck(page, false);

    const ctxPage = await openUrlInNewContext(page, page.url());

    await expect(
      ctxPage.getByTestId("listcard-22be57b3-4e9f-4ecf-8f95-adf3edcf239d"),
    ).toBeVisible();

    await ctxPage.close();
    await unshareDeck(page);
  });

  test("import a shared deck with fan-made cards", async ({ page }) => {
    await createDeckWithFanMadeCard(page);
    await shareDeck(page, false);

    const ctxPage = await openUrlInNewContext(page, page.url());
    await ctxPage.getByTestId("share-import").click();
    await ctxPage.getByTestId("view-edit").click();
    await ctxPage.getByTestId("card-type-encounter").click();
    await fillSearch(ctxPage, "The Persian");

    await expect(
      ctxPage
        .getByTestId("virtuoso-item-list")
        .getByTestId("listcard-22be57b3-4e9f-4ecf-8f95-adf3edcf239d"),
    ).toBeVisible();
    await expect(
      ctxPage
        .getByTestId("editor-tabs-slots")
        .getByTestId("listcard-22be57b3-4e9f-4ecf-8f95-adf3edcf239d"),
    ).toBeVisible();

    await ctxPage.close();
    await unshareDeck(page);
  });

  test("cards from fan-made cards are not shown in the collection", async ({
    page,
  }) => {
    await createDeckWithFanMadeCard(page);
    await shareDeck(page, false);

    const ctxPage = await openUrlInNewContext(page, page.url());
    await ctxPage.getByTestId("share-import").click();
    await ctxPage.getByTestId("masthead-logo").click();
    await ctxPage.getByTestId("card-type-encounter").click();
    await fillSearch(ctxPage, "The Persian");

    await ctxPage.close();
    await unshareDeck(page);
  });

  test("fan-made packs can be quick-installed via their id", async ({
    page,
  }) => {
    await page.goto(
      "/install-fan-made-content?id=84b08ede-8129-4914-b0e3-f48ec649af9f",
    );
    await page.getByTestId("quick-install").click();

    const collectionItems = page
      .getByTestId("collection")
      .getByTestId("collection-project-title");

    expect(await collectionItems.all()).toHaveLength(1);
    await expect(collectionItems).toHaveText("Dark Matter");
  });

  test("fan-made cards are shown in card relations", async ({ page }) => {
    await page.goto(
      "/install-fan-made-content?id=530aa058-2450-4ef6-acad-1c99a0e89a8c",
    );

    await page.getByTestId("quick-install").click();

    const collectionItems = page
      .getByTestId("collection")
      .getByTestId("collection-project-title");

    expect(await collectionItems.all()).toHaveLength(1);
    await expect(collectionItems).toHaveText(
      "Forget Me Not Investigator Expansion",
    );
    await page.getByTestId("masthead-logo").click();
    await fillSearch(page, "Snipe");
    await expect(
      page.getByTestId("listcard-cd00bc7f-398e-4f3b-885f-1048cd840086"),
    ).toBeVisible();
    await page
      .getByTestId("listcard-4342f012-9ead-4009-9cb5-76bdda711521")
      .click();
    await page.getByTestId("listcard-08087").click();

    await page
      .getByTestId("listcard-08087")
      .getByTestId("listcard-title")
      .click();
    await expect(
      page
        .getByTestId("cardset-level")
        .getByTestId("listcard-cd00bc7f-398e-4f3b-885f-1048cd840086"),
    ).toBeVisible();
    await page
      .getByTestId("cardset-level")
      .getByTestId("listcard-4342f012-9ead-4009-9cb5-76bdda711521")
      .click();
    await page
      .getByTestId("cardset-level")
      .getByTestId("listcard-cd00bc7f-398e-4f3b-885f-1048cd840086")
      .getByTestId("listcard-title")
      .click();
    await expect(
      page.getByTestId("cardset-level").getByTestId("listcard-08087"),
    ).toBeVisible();
  });

  test("fan-made cards are not shown in card relations when setting is off", async ({
    page,
  }) => {
    await page.goto(
      "/install-fan-made-content?id=530aa058-2450-4ef6-acad-1c99a0e89a8c",
    );

    await page.getByTestId("quick-install").click();

    const collectionItems = page
      .getByTestId("collection")
      .getByTestId("collection-project-title");

    expect(await collectionItems.all()).toHaveLength(1);
    await expect(collectionItems).toHaveText(
      "Forget Me Not Investigator Expansion",
    );

    await page.getByLabel("Card lists").selectOption("official");
    await page.getByTestId("settings-save").click();
    await page.getByTestId("masthead-logo").click();
    await page.getByTestId("search-input").click();
    await page.getByTestId("search-input").fill("Snipe");
    await expect(page.getByTestId("listcard-08087")).toBeVisible();
    await fillSearch(page, "Snipe");
    await expect(
      page.getByTestId("listcard-cd00bc7f-398e-4f3b-885f-1048cd840086"),
    ).not.toBeVisible();
    await page.getByTestId("listcard-title").click();
    await expect(
      page
        .getByTestId("cardset-level")
        .getByTestId("listcard-cd00bc7f-398e-4f3b-885f-1048cd840086"),
    ).not.toBeVisible();
  });
});

async function createDeckWithFanMadeCard(page: Page) {
  await page.goto("/settings?tab=fan-made-content");
  await importPackFromFile(page, "fan_made_scenario_project.json");
  await page.getByTestId("masthead-logo").click();
  await page.getByTestId("collection-create-deck").click();
  await page
    .getByTestId("listcard-01001")
    .getByTestId("create-choose-investigator")
    .click();
  await page.getByTestId("create-save").click();
  await page.getByTestId("card-type-encounter").click();
  await fillSearch(page, "The Persian");

  await page
    .getByTestId("listcard-22be57b3-4e9f-4ecf-8f95-adf3edcf239d")
    .getByTestId("quantity-increment")
    .click();

  await page.getByTestId("editor-save").click();
  await expect(page.getByTestId("view-edit")).toBeVisible();
}
