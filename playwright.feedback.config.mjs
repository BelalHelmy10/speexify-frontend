import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/feedback",
  testMatch: "**/*.spec.mjs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 6_000 },
  outputDir: "test-results/feedback",
  reporter: [["list"]],
  use: {
    headless: true,
    actionTimeout: 8_000,
    locale: "en-US",
    timezoneId: "Africa/Cairo",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"] } },
  ],
});
