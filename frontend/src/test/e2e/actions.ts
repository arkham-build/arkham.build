import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { assert } from "@/utils/assert";

export async function importDeck(page: Page) {
  await page.goto("/");

  await page.getByTestId("import-trigger").click();
  await page.getByTestId("import-input").click();

  await page
    .getByTestId("import-input")
    .fill(
      "https://arkhamdb.com/decklist/view/47001/khaku-fifty-shades-of-blurse-fhv-intro-deck-guide-1.0",
    );

  await page.getByTestId("import-submit").click();
}

export function locateCardInSlots(locator: Page | Locator, code: string) {
  return locator
    .getByTestId("editor-tabs-slots")
    .getByTestId(`listcard-${code}`);
}

export async function waitForImagesLoaded(locator: Page | Locator) {
  for (const image of await locator.locator("img").all()) {
    const src = await image.getAttribute("src");
    if (src && !src.includes("svg")) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty("complete", true);
      await expect(image).not.toHaveJSProperty("naturalWidth", 0);
    }
  }
}

export async function importDeckFromFile(
  page: Page,
  deckPath: string,
  { navigate }: { navigate?: "view" | "edit" } = {},
) {
  await page.goto("/");
  await page.mouse.move(0, 0);

  const fileChooserPromise = page.waitForEvent("filechooser");

  await page.getByTestId("collection-more-actions").click();
  await page.getByTestId("collection-import-button").click();

  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([
    path.join(process.cwd(), "src/test/fixtures/decks", deckPath),
  ]);

  if (navigate) {
    await page.getByTestId("collection-deck").click();
  }

  if (navigate === "edit") {
    await page.getByTestId("view-edit").click();
  }
}

export async function shareDeck(page: Page, navigate = true) {
  await page.getByTestId("share-create").click();

  await expect(page.getByTestId("share-link")).toBeVisible({
    timeout: 15000,
  });

  if (navigate) {
    await page.waitForTimeout(1000);
    await page.$eval("a[target=_blank]", (el) => {
      el.removeAttribute("target");
    });

    await page.getByTestId("share-link").click();
    await expect(page).toHaveURL(/\/share/);
  }
}

export async function unshareDeck(page: Page) {
  await page.getByTestId("share-delete").click();
  await expect(page.getByTestId("share-link")).not.toBeVisible();
}

export function adjustDeckCardQuantity(
  page: Page,
  code: string,
  mode: "increment" | "decrement",
) {
  const locator = locateCardInSlots(page, code);
  return locator.getByTestId(`quantity-${mode}`).click();
}

export function adjustListCardQuantity(
  page: Page,
  code: string,
  mode: "increment" | "decrement",
) {
  return page
    .getByTestId("card-list-scroller")
    .getByTestId(`listcard-${code}`)
    .getByTestId(`quantity-${mode}`)
    .click();
}

export async function fillSearch(page: Page, text: string) {
  await page.getByTestId("search-input").click();
  await page.getByTestId("search-input").clear();
  await page.getByTestId("search-input").fill(text);
  await page.waitForTimeout(150);
}

export function assertEditorDeckQuantity(
  page: Page,
  code: string,
  quantity: number,
  deletionsHidden = true,
) {
  if (quantity === 0 && deletionsHidden) {
    return expect(
      page.getByTestId("editor").getByTestId(`listcard-${code}`),
    ).not.toBeVisible();
  }

  return expect(
    page
      .getByTestId("editor")
      .getByTestId(`listcard-${code}`)
      .getByTestId("quantity-value"),
  ).toContainText(`${quantity}`);
}

export async function upgradeDeck(page: Page, xp = 5) {
  await page.getByTestId("view-upgrade").click();
  await page.getByTestId("upgrade-xp").fill(xp.toString());
  await page.getByTestId("upgrade-save-close").click();
  await expect(page.getByTestId("view-latest-upgrade")).toBeVisible();
}

export function defaultScreenshotMask(page: Page) {
  return [page.getByTestId("card-scan"), page.getByTestId("card-thumbnail")];
}

export async function openUrlInNewContext(page: Page, url: string) {
  const ctx = await page.context().browser()?.newContext();
  assert(ctx, "Browser context should not be null");
  const ctxPage = await ctx.newPage();
  await ctxPage.goto(url);
  return ctxPage;
}

export async function importPackFromFile(page: Page, packPath: string) {
  const fileChooserPromise = page.waitForEvent("filechooser");

  await page.getByTestId("collection-import-button").click();

  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([
    path.join(process.cwd(), "src/test/fixtures/stubs", packPath),
  ]);

  await page.waitForTimeout(300);
}
