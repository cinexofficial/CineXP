import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: ["unit/**"],
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    baseURL: "http://127.0.0.1:3100",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: ["**/release-admin.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      testIgnore: ["**/release-admin.spec.ts"],
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node tests/catalog-server.mjs",
      url: "http://127.0.0.1:4010",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3100 --webpack",
      url: "http://127.0.0.1:3100",
      timeout: 180_000,
      stdout: 'pipe',
      reuseExistingServer: false,
      env: {
        TMDB_PREVIEW_ORIGIN: "http://127.0.0.1:4010",
        DISPLAY_ADS_ENABLED: "true",
        ADS_VERIFIED_PLACEMENTS: 'home-primary,home-secondary,catalog-movies,catalog-series,catalog-trending,catalog-genre,watch-below-player,download-below-actions',
        NEXT_PUBLIC_AD_TEST_ORIGIN: 'http://127.0.0.1:4010',
        DATABASE_URL: process.env.TEST_DATABASE_URL || '',
        ADMIN_USERNAME: 'release-test-admin',
        ADMIN_PASSWORD: 'release-local-test-password',
        JWT_SECRET: 'local-admin-signing-key-for-browser-tests-only-0001',
        DOWNLOAD_TOKEN_SECRET: 'local-download-signing-key-for-browser-tests-0002',
      },
    },
  ],
});
