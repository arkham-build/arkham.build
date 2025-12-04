import { expect, test } from "@playwright/test";

test.describe("search", () => {
  test("search with ?q= query param", async ({ page }) => {
    await page.goto("/search?q=breaking+entering");
    await expect(page.getByTestId("search-input")).toHaveValue(
      "breaking entering",
    );
    await expect(page.getByTestId("listcard-02124")).toBeVisible();
    await expect(page.getByTestId("listcard-07114")).toBeVisible();
    await expect(page.getByTestId("listcard-09074")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("3 cards");
  });
});
