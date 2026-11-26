import { defineConfig, devices } from "@playwright/test";

/**
 * Read-only smoke tests: page loads only, nothing is clicked that saves. Runs against production by default.
 *
 * For a preview branch, set BASE_URL to its URL. Previews sit behind Vercel login, so also set
 * VERCEL_AUTOMATION_BYPASS_SECRET (Vercel project > Settings > Deployment Protection > Protection Bypass for Automation).
 *
 * Two workers on purpose: every page is force-dynamic, so each load is a real render against the Supabase pooler.
 */
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  workers: 2,
  retries: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "https://thelegsopen.com",
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
