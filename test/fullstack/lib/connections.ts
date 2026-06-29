import type { Page } from "@playwright/test";

export function getArkhamDbConnection(page: Page) {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "ArkhamDB" }),
  });
}
