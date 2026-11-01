// End-to-end tests with real accounts, against the local Firebase emulators:
//   npm run test:e2e:firebase   (starts the emulators, then runs these tests)
// No real Firebase project or service account is used.
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { chromium } from "./playwright.config.mjs";

export const EMULATOR_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-mantor.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-mantor",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "",
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  // The server's Admin SDK talks to the same emulators (no service account needed).
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_SERVICE_ACCOUNT: "",
  ANTHROPIC_API_KEY: "",
  // Emails are written to this file instead of being sent (see lib/server/mail.js).
  MAIL_OUTBOX: path.join(os.tmpdir(), "mantor-e2e-mail.jsonl"),
  SMTP_HOST: "",
  SITE_URL: "http://localhost:3200",
};

export default defineConfig({
  testDir: "e2e",
  testMatch: "accounts.spec.mjs",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0, // the tests build on each other (one shared story), so a retry would not help
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-firebase" }]] : "list",
  use: {
    baseURL: "http://localhost:3200",
    viewport: { width: 1280, height: 900 },
    launchOptions: chromium,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npx next start -p 3200",
    url: "http://localhost:3200",
    timeout: 240_000,
    reuseExistingServer: false,
    env: { NEXT_DIST_DIR: ".next-e2e-firebase", ...EMULATOR_ENV },
  },
});
