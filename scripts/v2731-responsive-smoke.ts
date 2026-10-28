/**
 * Focused overflow smoke for the certified audio, library, and historical screens.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const widths = [1440, 768, 390, 360];
const report: Record<string, unknown> = {};

async function login(page: Page) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator('input[name="email"]').fill("v272-user-a@studio.local.test");
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => Object.keys(document.querySelector('form button[type="submit"]') ?? {}).some((key) => key.startsWith("__react")));
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 20000 }).catch(() => undefined);
  if (page.url().includes("/login")) {
    const status = await page.evaluate(async (input) => {
      const next = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return next.status;
    }, { email: "v272-user-a@studio.local.test", password });
    if (status !== 200) throw new Error("Login failed");
  }
}

async function measure(page: Page, name: string, ready: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator(ready).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: path.join(evidence, `${name}-${width}.png`) });
    rows.push({ width, overflow, ready: await page.locator(ready).isVisible() });
  }
  report[name] = rows;
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(90000);
  await login(page);
  await page.goto(`${base}/studio/projects/cmvrdlbwg0005dh92s468jz8g?section=timeline&workflow=film`, { waitUntil: "commit" });
  await measure(page, "timeline", '[data-testid="film-timeline-play"]');
  await page.goto(`${base}/studio/projects/cmvrdlbwg0005dh92s468jz8g?section=scenes&scene=cmvrdnblh000bdh92jjl4bhrb&workflow=film`, { waitUntil: "commit" });
  await page.locator('[data-testid="studio-v273-browse-library"]').waitFor();
  await page.locator('[data-testid="studio-v273-browse-library"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.locator('[data-testid="studio-v273-attach-asset-cmvscmlyh0001dht7b64pqhgv"]').waitFor();
  await measure(page, "library", '[data-testid="studio-v273-attach-asset-cmvscmlyh0001dht7b64pqhgv"]');
  await page.goto(`${base}/editor/start?session=v273-hist-image-0001&restoreServer=1`, { waitUntil: "commit" });
  await measure(page, "historical-image", '[data-testid="editor-menu"]');
  await page.goto(`${base}/videos/cmv273histanim0001`, { waitUntil: "commit" });
  await measure(page, "historical-animation", "h1");
  await writeFile(path.join(evidence, "responsive-smoke.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "responsive-smoke.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
