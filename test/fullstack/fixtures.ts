import { test as base } from "@playwright/test";
import { mockApiCalls } from "../e2e/tests/mocks.ts";

export const test = base.extend({
  page: async ({ page }, use) => {
    await mockApiCalls(page);
    await use(page);
  },
});
