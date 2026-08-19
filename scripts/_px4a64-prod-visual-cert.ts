#!/usr/bin/env npx tsx
/**
 * PX.4A.6.4 Production visual cert — untracked helper.
 * Chromium against studio.homecheff.eu. Does not publish or encode.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, type Page } from "playwright";

const STUDIO = process.env.STUDIO_BASE_URL ?? "https://studio.homecheff.eu";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, "docs/audits/px4a64-prod-cert");
const SHOT_DIR = join(OUT_DIR, "shots");

async function dpl(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const link = [...document.querySelectorAll('link[rel="preload"]')].find((el) =>
      (el as HTMLLinkElement).href.includes("dpl=")
    ) as HTMLLinkElement | undefined;
    const m = link?.href.match(/dpl=([^&]+)/);
    return m?.[1] ?? null;
  });
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${Date.now()}-${name}.png`), fullPage: false }).catch(() => undefined);
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function openCreator(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  const resume = page.getByTestId("px4a-resume-fresh");
  if (await resume.count()) await resume.click();
}

async function globalSnapshot(page: Page) {
  await page.getByTestId("px4a-global-video").scrollIntoViewIfNeeded();
  return {
    dpl: await dpl(page),
    overflow: await overflow(page),
    duration: await page.getByTestId("px4a-video-duration").innerText(),
    style: await page.getByTestId("px4a-style").innerText(),
    movement: await page.getByTestId("px4a-movement").innerText(),
    audioNone: await page.getByTestId("px4a-audio-none").isVisible(),
    musicPanel: await page.locator("[data-testid='px4a-audio'] input[type='file']").count(),
    more: await page.getByTestId("px4a-global-more").isVisible(),
    save: await page.getByTestId("px4a-save").isVisible(),
    finish: await page.getByTestId("px4a-item-finish").count(),
    creditBanner: await page.getByTestId("low-credit-banner").count(),
    contextModel: await page.getByTestId("px4a-context-none-helper").isVisible().catch(() => false)
      || (await page.getByTestId("px4a-context-bar").isVisible().catch(() => false)),
    canvases: await page.locator("[data-testid='px4a-composer'] canvas").count(),
    standard: await page.getByTestId("px4a-transition-group-standard").innerText().catch(() => ""),
    signature: await page.getByTestId("px4a-transition-group-signature").innerText().catch(() => ""),
    catalog: await page.getByTestId("px4a-audio-catalog").isVisible(),
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report: Record<string, unknown> = { startedAt: new Date().toISOString() };
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
    const dPage = await desktop.newPage();
    await openCreator(dPage);
    report.desktop = await globalSnapshot(dPage);
    await shot(dPage, "desktop-global");
    await desktop.close();

    const m390 = await browser.newContext({
      ...devices["Pixel 5"],
      viewport: { width: 390, height: 844 },
      locale: "nl-NL",
    });
    const p390 = await m390.newPage();
    await openCreator(p390);
    report.mobile390 = await globalSnapshot(p390);
    await shot(p390, "390-global");
    await m390.close();

    const d = report.desktop as {
      overflow: number;
      style: string;
      duration: string;
      canvases: number;
      more: boolean;
      musicPanel: number;
      finish: number;
      standard: string;
      signature: string;
      catalog: boolean;
    };
    const m = report.mobile390 as { overflow: number; style: string; canvases: number; more: boolean; contextModel: boolean };
    report.status =
      d.overflow <= 8 &&
      m.overflow <= 8 &&
      d.canvases === 1 &&
      m.canvases === 1 &&
      /Overgang/.test(d.style) &&
      /Knippen/.test(d.standard) &&
      /Scherven/.test(d.signature) &&
      /Duur/.test(d.duration) &&
      d.audioNone &&
      d.more &&
      d.musicPanel === 0 &&
      d.finish === 0 &&
      m.contextModel
        ? "PASS"
        : "FAIL";
  } catch (err) {
    report.status = "FAIL";
    report.error = err instanceof Error ? err.message : String(err);
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT_DIR, "visual.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
  if (report.status !== "PASS") process.exit(1);
}

void main();
