import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { assert } from "./assert";

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

  await expect(
    page.getByTestId("collection-deck").getByTestId("deck-summary-title"),
  ).toContainText("Kōhaku, Fifty Shades of Blurse|FHV Intro|Deck Guide");
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

  const directory = import.meta.dirname;
  const filePath = path.join(directory, "../../fixtures/decks", deckPath);
  const deckName = await readDeckName(filePath);

  const deck = page.getByTestId(`collection-deck-${deckName}`);

  await fileChooser.setFiles([filePath]);
  await expect(deck).toBeVisible();

  if (navigate) {
    await deck.getByTestId("collection-deck").hover({
      force: true,
    });
    await deck.getByTestId("collection-deck").click();
  }

  if (navigate === "edit") {
    await page.getByTestId("view-edit").click();
  }
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

  const dir = import.meta.dirname;

  await fileChooser.setFiles([
    path.join(dir, "../../fixtures/stubs", packPath),
  ]);

  await page.waitForTimeout(300);
}

async function readDeckName(filePath: string) {
  const value: unknown = JSON.parse(await readFile(filePath, "utf8"));

  if (!value || typeof value !== "object") {
    throw new Error(`Invalid deck file: ${filePath}`);
  }

  const { name } = value as { name?: unknown };
  if (typeof name !== "string") {
    throw new Error(`Invalid deck file: ${filePath}`);
  }

  return name;
}
