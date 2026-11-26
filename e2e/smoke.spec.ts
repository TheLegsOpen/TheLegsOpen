import { expect, test, type Page } from "@playwright/test";

/**
 * Read-only: every test only loads pages. Nothing here signs in or saves, so it is safe against production.
 *
 * Each page must return a non-error status, throw no uncaught browser error, and render real content.
 * The admin isn't covered: opening a Payload edit view writes a document lock, and previews can't write.
 */

// The cookie banner is a full-screen overlay until it's answered; start every test as a visitor who declined.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("legs-open-cookie-consent", "declined"));
});

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${path} status`).toBeLessThan(400);
  // The /score app has no <main>; its pages are checked by their heading instead.
  if (!path.startsWith("/score")) await expect(page.locator("main")).not.toBeEmpty();
  await expect(page.getByText("Application error")).toHaveCount(0);
  return errors;
}

test("home page renders the hero, leaderboard, homepage sections and news", async ({ page }) => {
  const errors = await open(page, "/");
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  // Hero + leaderboard band + news grid are three sections; at least one admin-managed homepage section makes four. The
  // EMAXCONN outage showed up as the homepage sections silently missing, so a page that still returns 200 has to fail here.
  expect(await page.locator("main section").count()).toBeGreaterThanOrEqual(4);
  expect(await page.locator('main a[href^="/latest/"]').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

const PUBLIC_PAGES = [
  "/latest",
  "/leaderboard",
  "/live-blog",
  "/field",
  "/tee-times",
  "/head-to-head",
  "/previous-opens",
  "/records",
  "/statistics",
  "/media",
  "/venues",
  "/patrons-and-suppliers",
  "/careers",
];

for (const path of PUBLIC_PAGES) {
  test(`${path} renders`, async ({ page }) => {
    const errors = await open(page, path);
    expect(errors).toEqual([]);
  });
}

// A year that has been played: the newest year on /previous-opens can be the next championship, which has no results yet.
test("a previous Open's results, its replay and a player page render", async ({ page }) => {
  const yearPath = "/previous-opens/2024";
  const errors = await open(page, yearPath);
  await page.getByRole("tab", { name: "Results" }).click();
  await expect(page.getByRole("tabpanel", { name: "Main" }).locator("tbody tr").first()).toBeVisible();

  // Leaderboard rows open a popup rather than linking, so take a player from The Field.
  errors.push(...(await open(page, "/field")));
  const playerPath = await page.locator('main a[href^="/players/"]').first().getAttribute("href");
  expect(playerPath, "a player link on /field").toBeTruthy();
  errors.push(...(await open(page, playerPath!)));
  errors.push(...(await open(page, `${yearPath}/replay`)));
  expect(errors).toEqual([]);
});

test("an article renders", async ({ page }) => {
  await open(page, "/latest");
  const articlePath = await page.locator('main a[href^="/latest/"]').first().getAttribute("href");
  expect(articlePath).toBeTruthy();
  const errors = await open(page, articlePath!);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the /score app's sign-in page renders", async ({ page }) => {
  const errors = await open(page, "/score/login");
  await expect(page.getByRole("heading", { name: "Scorer Login" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "PIN" })).toBeVisible();
  expect(errors).toEqual([]);
});
