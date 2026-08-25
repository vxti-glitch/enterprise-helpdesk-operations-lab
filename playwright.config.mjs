import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "web",
  testMatch: "**/*.browser.test.mjs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "python -m http.server 4173 --directory web",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
