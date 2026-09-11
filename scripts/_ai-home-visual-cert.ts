/**
 * Visual QA smoke for AI-first Studio home — local production server.
 * Run: npx playwright test scripts/_ai-home-visual-cert.ts --config=playwright.config.ts
 * Or: npx tsx scripts/_ai-home-visual-cert.ts
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.AI_HOME_BASE_URL ?? "http://127.0.0.1:3011";
const OUT = "docs/audits/studio-ai-first/screenshots";

async function shot(
  page: import("playwright").Page,
  name: string
) {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function assertHome(page: import("playwright").Page, label: string) {
  await page.goto(`${BASE}/studio`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const home = page.getByTestId("studio-unified-home").first();
  await home.waitFor({ state: "visible", timeout: 30000 });
  const prompt = home.getByTestId("studio-ai-home-prompt");
  await prompt.waitFor({ state: "visible", timeout: 30000 });
  const box = await prompt.boundingBox();
  if (!box) throw new Error(`${label}: prompt not boxed`);
  const vh = page.viewportSize()?.height ?? 800;
  const foldLimit = vh < 420 ? 0.72 : 0.55;
  if (box.y > vh * foldLimit) {
    throw new Error(`${label}: prompt too far below fold (y=${box.y}, vh=${vh})`);
  }
  await home.getByTestId("studio-ai-home-attach-media").waitFor({ state: "visible" });
  await home.getByTestId("studio-ai-home-inspiration").waitFor({ state: "visible" });
  await page.getByTestId("studio-home-intents").first().waitFor({ state: "visible" });
  await page.getByTestId("studio-home-advanced").first().waitFor({ state: "visible" });

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  if (overflow) throw new Error(`${label}: horizontal overflow`);

  await prompt.fill("Maak een professionele productadvertentie. ".repeat(12));
  await home.getByTestId("studio-ai-home-inspiration-advertisement").click();
  await prompt.waitFor({ state: "visible" });

  return box.y;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results: string[] = [];

  // iPhone portrait
  {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    const y = await assertHome(page, "iphone-portrait");
    await shot(page, "iphone-portrait-home");
    results.push(`iphone-portrait PASS (prompt y=${Math.round(y)})`);
    await ctx.close();
  }

  // iPhone landscape
  {
    const ctx = await browser.newContext({
      ...devices["iPhone 13 landscape"],
    });
    const page = await ctx.newPage();
    const y = await assertHome(page, "iphone-landscape");
    await shot(page, "iphone-landscape-home");
    results.push(`iphone-landscape PASS (prompt y=${Math.round(y)})`);
    await ctx.close();
  }

  // Desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const y = await assertHome(page, "desktop");
    await shot(page, "desktop-home");

    // Confirm flow (no spend — free photo-video inspiration)
    await page.goto(`${BASE}/studio`, { waitUntil: "domcontentloaded" });
    const home = page.getByTestId("studio-unified-home").first();
    await home.getByTestId("studio-ai-home-inspiration-photo_video").scrollIntoViewIfNeeded();
    await home.getByTestId("studio-ai-home-inspiration-photo_video").click();
    await home.getByTestId("studio-ai-home-submit").click();
    await home.getByTestId("studio-ai-home-confirm").waitFor({ state: "visible", timeout: 20000 });
    await shot(page, "desktop-confirm-free");
    results.push(`desktop PASS (prompt y=${Math.round(y)}; confirm visible)`);

    await page.evaluate(() => {
      document.cookie = "hc_locale=en; path=/";
      localStorage.setItem("hc-locale", "en");
    });
    await page.goto(`${BASE}/studio`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-unified-home").first().getByTestId("studio-ai-home-prompt").waitFor({ state: "visible" });
    await shot(page, "desktop-en-attempt");
    await ctx.close();
  }

  // Tablet
  {
    const ctx = await browser.newContext({ ...devices["iPad Mini"] });
    const page = await ctx.newPage();
    const y = await assertHome(page, "tablet");
    await shot(page, "tablet-home");
    results.push(`tablet PASS (prompt y=${Math.round(y)})`);
    await ctx.close();
  }

  await browser.close();
  for (const line of results) console.log(line);
  console.log("AI_HOME_VISUAL_QA = PASS");
}

main().catch((err) => {
  console.error(err);
  console.error("AI_HOME_VISUAL_QA = FAIL");
  process.exit(1);
});
