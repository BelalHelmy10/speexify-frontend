import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/classroom",
  testMatch: "**/*.spec.mjs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  outputDir: "test-results/classroom",
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report/classroom", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report/classroom", open: "never" }]],
  use: {
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "Africa/Cairo",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      metadata: { deviceClass: "desktop", realDevice: false },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
      metadata: { deviceClass: "desktop", realDevice: false },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
      metadata: { deviceClass: "desktop", realDevice: false },
    },
    {
      name: "webkit-iphone",
      use: { ...devices["iPhone 15"] },
      metadata: { deviceClass: "phone", realDevice: false },
    },
    {
      name: "webkit-ipad",
      use: { ...devices["iPad (gen 7)"] },
      metadata: { deviceClass: "tablet", realDevice: false },
    },
    {
      name: "chromium-pixel",
      use: { ...devices["Pixel 7"] },
      metadata: { deviceClass: "phone", realDevice: false },
    },
    {
      name: "chromium-android-tablet",
      use: { ...devices["Galaxy Tab S4"] },
      metadata: { deviceClass: "tablet", realDevice: false },
    },
  ],
});
