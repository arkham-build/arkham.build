import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { applyFullstackEnv, createStackEnv, frontendUrl } from "./lib/env.ts";

applyFullstackEnv();

const grep = process.env.E2E_PLAYWRIGHT_GREP
  ? new RegExp(process.env.E2E_PLAYWRIGHT_GREP)
  : undefined;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  grep,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        locale: "en-GB",
      },
    },
  ],
  webServer: {
    command: `${process.execPath} --experimental-strip-types ${path.join(import.meta.dirname, "stack.ts")}`,
    env: createStackEnv(),
    reuseExistingServer: false,
    stdout: "pipe",
    timeout: 300000,
    url: frontendUrl,
  },
});
