import path from "node:path";
import { expect, test } from "@playwright/test";
import { importDeck, importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
  await importDeck(page);
});

test.describe("deck collection", () => {
  test("render deck summary", async ({ page }) => {
    const deckNode = page.getByTestId("collection-deck");

    await expect(deckNode.getByTestId("deck-summary-xp")).toContainText(
      "31 XP",
    );
    await expect(deckNode.getByTestId("deck-summary-size")).toContainText(
      "30 (37)",
    );

    await expect(deckNode.getByTestId("deck-tags")).toContainText(
      "SoloMultiplayerThemeBeginner",
    );

    await expect(deckNode.getByTestId("deck-summary-title")).toContainText(
      "Kōhaku, Fifty Shades of Blurse|FHV Intro|Deck Guide",
    );

    await expect(
      deckNode.getByTestId("deck-summary-investigator"),
    ).toContainText("Kōhaku Narukami");

    await deckNode.click();
    await expect(page).toHaveURL(/\/deck\/view/);
  });

  test("create deck", async ({ page }) => {
    await page.getByTestId("collection-create-deck").click();
    await expect(page).toHaveURL(/\/deck\/create/);
  });

  test("import deck", async ({ page }) => {
    const deckNode = page.getByTestId("collection-deck");
    await expect(deckNode).toBeVisible();
    expect(await deckNode.count()).toBe(1);
  });

  test("import decks from files", async ({ page }) => {
    const fileChooserPromise = page.waitForEvent("filechooser");

    await page.getByTestId("collection-more-actions").click();
    await page.getByTestId("collection-import-button").click();

    const directory = import.meta.dirname;

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(directory, "../fixtures/decks/extra_slots.json"),
      path.join(directory, "../fixtures/decks/faction_select.json"),
    ]);

    await expect(page.getByTestId("collection-deck")).toHaveCount(3);
  });

  test("delete all local decks", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.getByTestId("collection-more-actions").click();
    await page.getByTestId("collection-delete-all").click();

    await expect(page.getByText("Collection empty")).toBeVisible();
    await expect(page.getByTestId("collection-deck")).not.toBeVisible();
  });

  test("archive decks", async ({ page }) => {
    await importDeckFromFile(page, "hunch_deck.json");
    await importDeckFromFile(page, "bonded.json");

    await page
      .getByTestId("collection-deck-Le Diamond")
      .getByTestId("deck-summary-title")
      .click();

    await page.getByTestId("view-more-actions").click();
    await page.getByTestId("view-archive").click();
    await page.getByTestId("masthead-logo").click();

    await page
      .getByTestId("collection-deck-Daisy Walker Investigates")
      .getByTestId("deck-summary-title")
      .click();

    await page.getByTestId("view-more-actions").click();
    await page.getByTestId("view-archive").click();
    await page.getByTestId("masthead-logo").click();

    await expect(page.getByTestId("collection-folder-Archive")).toHaveText(
      "Archive2 decks",
    );

    await page.getByTestId("collection-folder-Archive").click();

    await page
      .getByTestId("collection-deck-Daisy Walker Investigates")
      .getByTestId("deck-summary-title")
      .click();

    await page.getByTestId("view-more-actions").click();
    await page.getByTestId("view-archive").click();
    await page.getByTestId("masthead-logo").click();

    await expect(page.getByTestId("collection-folder-Archive")).toHaveText(
      "Archive1 decks",
    );
  });
});
