import path from "node:path";
import test, { expect, type Page } from "@playwright/test";
import { fillSearch, importPackFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
});

async function createLimitedPoolDeck(page: Page) {
  await page.goto("deck/create/01001");

  const input = page
    .getByTestId("limited-card-pool-field")
    .getByTestId("combobox-input");

  await input.click();

  await input.fill("revised core");

  await page
    .getByTestId("virtuoso-item-list")
    .getByText("Revised Core Set")
    .click();
  await input.fill("the forgotten age");

  await page.getByText("The Forgotten Age").first().click();
  await page.getByTestId("combobox-input").press("Escape");
  await page.getByTestId("create-save").click();
  await expect(page.getByTestId("limited-card-pool-tag")).toBeVisible();
}

test.describe("limited card pool", () => {
  test("setup card pool in deck create", async ({ page }) => {
    await createLimitedPoolDeck(page);
  });

  test("display card pool in deck editor", async ({ page }) => {
    await createLimitedPoolDeck(page);
    await expect(page.getByTestId("limited-card-pool-tag")).toBeVisible();
  });

  test("apply card pool in deck editor", async ({ page }) => {
    await createLimitedPoolDeck(page);
    await fillSearch(page, "machete");
    await expect(page.getByTestId("listcard-01520")).toBeVisible();
    await page.getByTestId("search").getByRole("button").click();
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).not.toBeVisible();
  });

  test("edit card pool in deck editor", async ({ page }) => {
    await createLimitedPoolDeck(page);

    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).not.toBeVisible();

    await page.getByTestId("editor-tab-config").click();

    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-input").fill("scarlet");
    await page.getByTestId("combobox-menu-item-tskp").click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
  });

  test("remove card pool in deck editor", async ({ page }) => {
    await createLimitedPoolDeck(page);

    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).not.toBeVisible();

    await page.getByTestId("editor-tab-config").click();
    await page
      .getByTestId("combobox-result-tfap")
      .getByTestId("combobox-result-remove")
      .click();
    await page.getByTestId("combobox-result-remove").click();
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
  });

  test("display card pool in deck view", async ({ page }) => {
    await createLimitedPoolDeck(page);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toBeVisible();
  });

  test("does not show preview cards in limited pool mode", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("tab-collection").click();
    await page.getByTestId("settings-show-previews").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("masthead-logo").click();
    await createLimitedPoolDeck(page);
    await fillSearch(page, "crowbar");
    await expect(page.getByTestId("cardlist-count").first()).toContainText(
      "0 cards",
    );
    await page.getByTestId("editor-tab-config").click();
    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-input").fill("drown");
    await page.getByTestId("combobox-menu-item-tdcp").click();
    await expect(page.getByTestId("listcard-11021")).toBeVisible();
  });

  test("allows adding cards to the card pool", async ({ page }) => {
    // import CPA pack
    await page.goto("/settings?tab=fan-made-content");
    await importPackFromFile(page, "campaign_playalong_project.json");
    await page.goto("/deck/create/01001");

    // configure limited card pool
    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-input").fill("revised core");
    await page.getByTestId("combobox-menu-item-rcore").click();
    await page.getByTestId("combobox-input").fill("CPA Basic Contracts");
    await page
      .getByTestId("combobox-menu-item-095447eb-1bcb-4203-9328-5a58436abbed")
      .click();
    await page.getByTestId("combobox-input").press("Escape");
    await page.getByTestId("create-save").click();

    // assert a card not in pool is not in card pool
    await page.getByTestId("search-input").fill("strong-armed");
    await expect(page.getByTestId("listcard-10031")).not.toBeVisible();

    // add a contract
    await page.getByTestId("search-input").fill("in the thick");
    await page
      .getByTestId("listcard-70b5bb78-8b12-40e4-a567-85f6996e836f")
      .getByTestId("quantity-increment")
      .click();

    // open card modal
    await page
      .getByTestId("editor-tabs-slots")
      .getByTestId("listcard-70b5bb78-8b12-40e4-a567-85f6996e836f")
      .getByTestId("listcard-title")
      .click();

    // add a card to the card pool
    let combobox = page.getByTestId(
      "card_pool_extension_70b5bb78-8b12-40e4-a567-85f6996e836f",
    );
    await combobox.getByTestId("combobox-input").click();
    await combobox.getByTestId("combobox-input").fill("strong-armed");
    await page.getByTestId("combobox-menu-item-10031").click();
    await combobox.getByTestId("combobox-input").press("Escape");
    await combobox.getByTestId("combobox-input").press("Escape");

    // check that card pool is configurable from the config
    await page.getByTestId("editor-tab-config").click();

    // assert the card is now in the card pool
    await page.getByTestId("search-input").fill("strong-armed");
    await expect(page.getByTestId("listcard-10031")).toBeVisible();

    combobox = page
      .getByTestId("meta-limited-card-pool")
      .getByTestId("card_pool_extension_70b5bb78-8b12-40e4-a567-85f6996e836f");

    await combobox
      .getByTestId("combobox-result-10031")
      .getByTestId("combobox-result-remove")
      .click();

    await expect(page.getByTestId("listcard-10031")).not.toBeVisible();
  });
});

test.describe("environments", () => {
  test("applies the current environment", async ({ page }) => {
    await page.goto("deck/create/01001");
    await page.getByTestId("limited-card-pool-environments").click();
    await page.getByTestId("limited-card-pool-environment-current").click();
    await page
      .getByTestId("limited-card-pool-environment-current-apply")
      .click();
    await expect(
      page.getByTestId("limited-card-pool-field"),
    ).toHaveScreenshot();

    await page.getByTestId("create-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
  });

  test("applies the legacy environment", async ({ page }) => {
    await page.goto("deck/create/01001");
    await page.getByTestId("combobox-input").click();
    await page.getByTestId("combobox-input").fill("core");
    await page.getByTestId("combobox-menu-item-rcore").click();
    await page.getByTestId("combobox-input").press("Escape");
    await page.getByTestId("limited-card-pool-environments").click();
    await page.getByTestId("limited-card-pool-environment-legacy").click();
    await page
      .getByTestId("limited-card-pool-environment-legacy-apply")
      .click();
    await expect(
      page.getByTestId("limited-card-pool-field"),
    ).toHaveScreenshot();
    await page.getByTestId("create-save").click();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
  });

  test("applies a limited environment", async ({ page }) => {
    await page.goto("deck/create/01001");
    await page.getByTestId("limited-card-pool-environments").click();
    await page.getByTestId("limited-card-pool-environment-limited").click();
    await page
      .getByTestId("cycle-select-combobox")
      .getByTestId("combobox-input")
      .click();
    await page
      .getByTestId("cycle-select-combobox")
      .getByTestId("combobox-input")
      .fill("dunwich");
    await page.getByTestId("combobox-menu-item-dwl").click();
    await page
      .getByTestId("cycle-select-combobox")
      .getByTestId("combobox-input")
      .fill("carcosa");
    await page.getByTestId("combobox-menu-item-ptc").click();
    await page
      .getByTestId("cycle-select-combobox")
      .getByTestId("combobox-input")
      .fill("edge of the earth");
    await page.getByTestId("combobox-menu-item-eoe").click();
    await page
      .getByTestId("limited-card-pool-environment-limited-apply")
      .click();
    await expect(
      page.getByTestId("limited-card-pool-field"),
    ).toHaveScreenshot();
    await page.getByTestId("create-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
  });

  test("applies a campaign play-along environment", async ({ page }) => {
    await page.goto("deck/create/01001");
    await page.getByTestId("limited-card-pool-environments").click();
    await page
      .getByTestId("limited-card-pool-environment-campaign_playalong")
      .click();
    await page
      .getByTestId("cycle-select-combobox")
      .getByTestId("combobox-input")
      .click();
    await page
      .getByTestId("cycle-select-combobox")
      .getByTestId("combobox-input")
      .fill("dunwich");
    await page.getByTestId("combobox-menu-item-dwl").click();
    await page
      .getByTestId("limited-card-pool-environment-campaign_playalong-apply")
      .click();
    await expect(
      page.getByTestId("limited-card-pool-field"),
    ).toHaveScreenshot();
    await page.getByTestId("create-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("limited-card-pool-tag")).toHaveScreenshot();
  });

  test("applies collection environment", async ({ page }) => {
    await page.goto("/settings?tab=collection");
    await page.getByText("Show all cards as owned").click();
    await page.getByText("The Miskatonic Museum").click();
    await page.getByText("The Path to Carcosa Investigator Expansion").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("masthead-logo").click();
    await page.getByTestId("collection-create-deck").click();
    await fillSearch(page, "mark harrigan");
    await page.getByTestId("create-choose-investigator").click();
    await page.getByTestId("limited-card-pool-environments").click();
    await page.getByTestId("limited-card-pool-environment-collection").click();
    await page
      .getByTestId("limited-card-pool-environment-collection-apply")
      .click();
    await expect(
      page.getByTestId("limited-card-pool-field"),
    ).toHaveScreenshot();
  });
});

test.describe("sealed deck", () => {
  test("can create sealed deck", async ({ page }) => {
    await page.goto("/deck/create/01001");
    await uploadSealedDeck(page);
    await page.getByTestId("create-save").click();
    await fillSearch(page, "art student");
    await expect(page.getByTestId("listcard-02149")).toBeVisible();
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).not.toBeVisible();
  });

  test("can undo sealed deck", async ({ page }) => {
    await page.goto("/deck/create/01001");
    await uploadSealedDeck(page);
    await page.getByTestId("sealed-deck-remove").click();
    await page.getByTestId("create-save").click();
    await fillSearch(page, "art student");
    await expect(page.getByTestId("listcard-02149")).toBeVisible();
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
  });

  test("can remove sealed deck", async ({ page }) => {
    await page.goto("/deck/create/01001");
    await uploadSealedDeck(page);
    await page.getByTestId("create-save").click();
    await page.getByTestId("editor-tab-config").click();
    await page.getByTestId("sealed-deck-remove").click();
    await fillSearch(page, "art student");
    await expect(page.getByTestId("listcard-02149")).toBeVisible();
    await fillSearch(page, "runic axe");
    await expect(page.getByTestId("listcard-09022")).toBeVisible();
  });

  test("applies sealed deck quantities", async ({ page }) => {
    await page.goto("/deck/create/01001");
    await uploadSealedDeck(page);
    await page.getByTestId("create-save").click();
    await page
      .getByTestId("listcard-01020")
      .getByTestId("quantity-increment")
      .click();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-01020")
      .getByTestId("quantity-increment")
      .click();

    await expect(
      page
        .getByTestId("editor-tabs-slots")
        .getByTestId("listcard-01020")
        .getByTestId("quantity-value"),
    ).toContainText("2/2");

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-02149")
      .getByTestId("quantity-increment")
      .click();

    await expect(
      page
        .getByTestId("editor-tabs-slots")
        .getByTestId("listcard-02149")
        .getByTestId("quantity-value"),
    ).toContainText("1/1");

    expect(
      page
        .getByTestId("virtuoso-item-list")
        .getByTestId("listcard-02149")
        .getByTestId("quantity-increment"),
    ).toBeDisabled();

    await expect(
      page
        .getByTestId("editor-tabs-slots")
        .getByTestId("listcard-02149")
        .getByTestId("quantity-increment"),
    ).toBeDisabled();

    await page
      .getByTestId("virtuoso-item-list")
      .getByTestId("listcard-02149")
      .getByTestId("listcard-title")
      .click();

    await expect(
      page
        .getByTestId("card-modal-quantities-main")
        .getByTestId("quantity-increment"),
    ).toBeDisabled();

    await page.getByTestId("card-modal").press("Escape");

    await page.getByTestId("editor-tab-sideslots").click();
    await page
      .getByTestId("listcard-02149")
      .getByTestId("quantity-increment")
      .click();
    await page.getByTestId("editor").getByTestId("editor-move-to-main").click();
    await page.getByTestId("editor-tab-slots").click();

    await expect(
      page
        .getByTestId("editor-tabs-slots")
        .getByTestId("listcard-02149")
        .getByTestId("quantity-value"),
    ).toContainText("1/1");
  });
});

async function uploadSealedDeck(page: Page) {
  const fileChooserPromise = page.waitForEvent("filechooser");

  await page.getByTestId("sealed-deck-button").click();

  const directory = import.meta.dirname;

  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([
    path.join(directory, "../fixtures/stubs/sealed_deck_definition.csv"),
  ]);
}
