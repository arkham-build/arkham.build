import { expect, test } from "@playwright/test";
import { importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
  await page.goto("/");
});

test.describe("deck description", () => {
  test("redirect card links to arkham.build", async ({ page }) => {
    await importDeckFromFile(page, "./deck_description.json", {
      navigate: "view",
    });
    await page.getByTestId("tab-notes").click();

    await page.getByRole("link", { name: "Colt" }).first().click();

    await expect(
      page.getByTestId("card-modal").getByTestId("card-face"),
    ).toBeVisible();

    await expect(page.getByTestId("card-modal")).toBeVisible();
    await expect(
      page
        .getByTestId("card-modal")
        .getByTestId("card-face")
        .getByTestId("card-name"),
    ).toContainText(".32 Colt");
  });

  test("redirect FAQ links to arkhamdb", async ({ page, context }) => {
    const arkhamdbBaseUrl = process.env.VITE_ARKHAMDB_BASE_URL as string;

    await context.route(`${arkhamdbBaseUrl}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html></html>",
      }),
    );

    await importDeckFromFile(page, "./deck_description.json", {
      navigate: "view",
    });
    await page.getByTestId("tab-notes").click();

    const [nextPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: "ruling" }).click(),
    ]);

    await expect(nextPage).toHaveURL(
      `${arkhamdbBaseUrl}/card/60132#review-5227`,
    );
  });

  test("redirect other relative links to arkhamdb", async ({
    page,
    context,
  }) => {
    const arkhamdbBaseUrl = process.env.VITE_ARKHAMDB_BASE_URL as string;

    await context.route(`${arkhamdbBaseUrl}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html></html>",
      }),
    );

    await importDeckFromFile(page, "./deck_description.json", {
      navigate: "view",
    });
    await page.getByTestId("tab-notes").click();

    const [nextPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: "decklist" }).click(),
    ]);

    await expect(nextPage).toHaveURL(
      `${arkhamdbBaseUrl}/decklist/view/51880/old-yorick-shot-guns-1.0`,
    );
  });

  test("redirect card links with nested content flow content", async ({
    page,
  }) => {
    await importDeckFromFile(page, "./deck_description.json", {
      navigate: "view",
    });
    await page.getByTestId("tab-notes").click();

    await page.getByRole("link", { name: "True Grit" }).first().click();

    await expect(page.getByTestId("card-modal")).toBeVisible();
    await expect(
      page
        .getByTestId("card-modal")
        .getByTestId("card-face")
        .getByTestId("card-name"),
    ).toContainText("True Grit");
  });

  test("redirect card links with nested block content", async ({ page }) => {
    await importDeckFromFile(page, "./deck_description.json", {
      navigate: "view",
    });
    await page.getByTestId("tab-notes").click();

    const cardLink = page
      .getByTestId("description-content")
      .getByRole("link", { name: "card" });

    await cardLink.press("Enter");

    await expect(page.getByTestId("card-modal")).toBeVisible();
    await expect(
      page
        .getByTestId("card-modal")
        .getByTestId("card-face")
        .getByTestId("card-name"),
    ).toContainText("Let me handle this");
  });
});
