/// <reference types="vitest/config" />
import path from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

loadEnvFile(path.join(import.meta.dirname, ".env.test"));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/tests/test-setup.ts"],
    hookTimeout: 60000,
  },
});
