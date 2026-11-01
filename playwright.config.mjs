// End-to-end tests in demo mode (no Firebase): npm run test:e2e
// The app is built into .next-e2e-demo and started on port 3100. Firebase and AI keys from
// .env.local are switched off (an empty value wins over .env files), so the tests never touch
// real data or spend money.
import { defineConfig } from "@playwright/test";

export const chromium = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

export default defineConfig({
  testDir: "e2e",
  testMatch: "demo.spec.mjs",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1280, height: 900 },
    launchOptions: chromium,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e-demo",
      NEXT_PUBLIC_FIREBASE_API_KEY: "",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
      ANTHROPIC_API_KEY: "",
    },
  },
});
