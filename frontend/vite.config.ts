/// <reference types="vitest" />
import path from "node:path";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import postcssExtendRule from "postcss-extend-rule";
import webpackStats from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
      },
    },
  },
  css: {
    postcss: {
      plugins: [autoprefixer(), postcssExtendRule()],
    },
  },
  plugins: [webpackStats(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  test: {
    environment: "happy-dom",
    exclude: ["src/test/e2e/**", "node_modules/**"],
    setupFiles: "./src/test/setup.ts",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
    },
  },
});
