import { chromium } from "playwright";

const BASE = process.env.S3_BASE || "http://127.0.0.1:3010";
const EMAIL = "s1.cert.1786212478@example.com";
const PASS = "S1CertPass2026!";
const SB = process.env.S3_SB || "cmskskf4w0001l404364pt91q";

const results = [];
function note(k, v) {
  results.push([k, v]);
  console.log(`${k}: ${v}`);
}

async function viewportSmoke(browser, name, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));

  const login = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASS },
  });
  note(`${name}.apiLogin`, login.status());

  await page.goto(`${BASE}/studio?storyboardId=${encodeURIComponent(SB)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("[data-testid=studio-adaptive-workspace]", { timeout: 60000 });
  await page.waitForTimeout(1500);

  // Ensure a scene is selected on narrow layouts
  const sceneSelect = page.locator("[data-testid=studio-left-rail] button[aria-current], [data-testid=studio-left-rail] li button").first();
  if (await sceneSelect.count()) {
    await sceneSelect.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
  }

  const shell = page.locator("[data-testid=studio-adaptive-workspace]");
  const posture = await shell.getAttribute("data-studio-posture");
  const robot = await shell.getAttribute("data-studio-permanent-robot");
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  note(`${name}.posture`, posture);
  note(`${name}.robot`, robot);
  note(`${name}.overflowX`, overflowX);
  note(`${name}.saveState`, (await page.locator("[data-testid=studio-save-state]").count()) > 0);
  note(`${name}.enterPreview`, (await page.locator("[data-testid=studio-enter-preview]").count()) > 0);
  note(`${name}.moveUp`, (await page.locator("[data-testid=studio-scene-move-up]").count()) > 0);
  note(`${name}.pageErrors`, errors.length);

  const enter = page.locator("[data-testid=studio-enter-preview]").first();
  if (await enter.count()) {
    await enter.evaluate((el) => el.click());
    await page.waitForTimeout(400);
    note(`${name}.previewBanner`, (await page.locator("[data-testid=studio-preview-mode-banner]").count()) > 0);
    const exit = page.locator("[data-testid=studio-exit-preview]").first();
    note(`${name}.exitPreview`, (await exit.count()) > 0);
    if (await exit.count()) await exit.evaluate((el) => el.click());
  }

  // Open More / Visual via tool strip if present
  const more = page.getByRole("button", { name: /More|Meer/i }).first();
  if (await more.count()) await more.click({ force: true }).catch(() => {});
  const visual = page.getByRole("button", { name: /Visual|Beeld/i }).first();
  if (await visual.count()) {
    await visual.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    note(`${name}.imageCredit`, (await page.locator("[data-testid=studio-scene-image-credit-hint]").count()) > 0);
    note(`${name}.genStatus`, (await page.locator("[data-testid=studio-generation-status]").count()) > 0);
  }

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await viewportSmoke(browser, "desktop", 1280, 800);
  await viewportSmoke(browser, "tablet", 900, 1200);
  await viewportSmoke(browser, "mobilePortrait", 390, 844);
  await viewportSmoke(browser, "mobileLandscape", 844, 390);
} finally {
  await browser.close();
}

const fails = results.filter(([k, v]) => {
  if (k.endsWith(".robot") && String(v) === "true") return true;
  if (k.endsWith(".overflowX") && v === true) return true;
  if (k.endsWith(".pageErrors") && Number(v) > 0) return true;
  if (k.endsWith(".apiLogin") && Number(v) !== 200) return true;
  return false;
});
note("FAIL_COUNT", fails.length);
if (fails.length) {
  console.error(fails);
  process.exit(1);
}
