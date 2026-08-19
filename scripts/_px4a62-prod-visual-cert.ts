#!/usr/bin/env npx tsx
/**
 * PX.4A.6.2 Production visual/mobile cert — untracked helper.
 * Chromium against studio.homecheff.eu. Does not publish. Does not encode.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, type Page } from "playwright";

const STUDIO = process.env.STUDIO_BASE_URL ?? "https://studio.homecheff.eu";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, "docs/audits/px4a62-prod-cert");
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

async function makePng(page: Page, color: string) {
  return Buffer.from(
    await page.evaluate((fill) => {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d");
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 720, 1280);
      return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
    }, color),
    "base64"
  );
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function canvasCount(page: Page) {
  return page.locator("[data-testid='px4a-preview-canvas']").count();
}

async function mobileLayout(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  const resume = page.getByTestId("px4a-resume-fresh");
  if (await resume.count()) await resume.click();
  const contextModel = await page.getByTestId("px4a-context-none-helper").isVisible().catch(() => false)
    || (await page.getByTestId("px4a-context-bar").isVisible().catch(() => false));
  const strip = await page.getByTestId("px4a-add-photo-tile").isVisible();
  const preview = await page.getByTestId("px4a-preview-dock").isVisible();
  const global = await page.getByTestId("px4a-global-video").isVisible();
  const thisPhoto = await page.getByText("Deze foto aanpassen").first().isVisible().catch(() => false);
  const wholeVideo = await page.locator('[data-testid="px4a-global-video"] summary, [data-testid="px4a-global-video"]').getByText("Voor hele video").first().isVisible().catch(() => false);
  await page.getByTestId("px4a-actions").scrollIntoViewIfNeeded();
  const covered = await page.evaluate(() => {
    const dock = document.querySelector("[data-testid='px4a-preview-dock']");
    const actions = document.querySelector("[data-testid='px4a-actions']");
    if (!dock || !actions) return true;
    const a = dock.getBoundingClientRect();
    const b = actions.getBoundingClientRect();
    return b.top < a.bottom - 4 && b.bottom > a.top + 4 && b.left < a.right && b.right > a.left;
  });
  return {
    overflow: await overflow(page),
    canvases: await canvasCount(page),
    contextModel,
    strip,
    preview,
    global,
    thisPhoto,
    wholeVideo,
    actionsCovered: covered,
    dpl: await dpl(page),
  };
}

async function editingJourney(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  const resume = page.getByTestId("px4a-resume-fresh");
  if (await resume.count()) await resume.click();
  const a = await makePng(page, "#c0392b");
  const b = await makePng(page, "#2980b9");
  await page.getByTestId("px4a-file-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: a },
    { name: "b.png", mimeType: "image/png", buffer: b },
  ]);
  await page.getByTestId("px4a-photo-0").waitFor({ timeout: 20_000 });
  await page.getByTestId("px4a-photo-0").locator("button[aria-pressed]").first().click();
  await page.getByTestId("px4a-context-text").click();
  await page.getByTestId("px4a-add-text").click();
  const input = page.getByTestId("px4a-text-input");
  await input.fill("IPHONE TEXT TEST");
  const inputValue = await input.inputValue();
  const inputType = await input.getAttribute("type");
  const inputMode = await input.getAttribute("inputmode");
  const webkitSecurity = await input.evaluate((el) => getComputedStyle(el).webkitTextSecurity);
  await shot(page, "390-text");
  await page.getByTestId("px4a-context-motion").click();
  const motionVisible = await page.getByTestId("px4a-movement-photo").isVisible();
  await page.getByTestId("px4a-movement-photo").getByRole("button", { name: "Inzoomen" }).click();
  await page.getByTestId("px4a-context-order").click();
  const earlier = await page.getByTestId("px4a-order-panel").getByRole("button", { name: "Eerder" }).isVisible();
  await page.evaluate(() => window.scrollBy(0, 420));
  await page.waitForTimeout(400);
  const compact = await page.getByTestId("px4a-preview-dock").getAttribute("data-compact");
  const stickyTop = await page.evaluate(() => {
    const dock = document.querySelector("[data-testid='px4a-preview-dock']") as HTMLElement | null;
    if (!dock) return null;
    return { top: dock.getBoundingClientRect().top, canvases: document.querySelectorAll("[data-testid='px4a-preview-canvas']").length };
  });
  await shot(page, "390-sticky-compact");
  await page.getByTestId("px4a-photo-1").locator("button[aria-pressed]").first().click();
  await page.getByTestId("px4a-context-text").click();
  await page.getByTestId("px4a-add-text").click();
  const leaked = await page.getByTestId("px4a-text-input").inputValue();
  await page.getByTestId("px4a-text-input").fill("BETA");
  await page.getByTestId("px4a-photo-0").locator("button[aria-pressed]").first().click();
  const back = await page.getByTestId("px4a-text-input").inputValue();
  await page.getByTestId("px4a-save").scrollIntoViewIfNeeded();
  const saveVisible = await page.getByTestId("px4a-save").isVisible();
  const downloadVisible = await page.getByTestId("px4a-export-download").isVisible();
  return {
    inputValue,
    inputType,
    inputMode,
    webkitSecurity,
    motionVisible,
    earlier,
    compact,
    stickyTop,
    leakedOntoPhoto2: leaked,
    photo1Back: back,
    saveVisible,
    downloadVisible,
    canvases: await canvasCount(page),
  };
}

async function desktopJourney(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  const resume = page.getByTestId("px4a-resume-fresh");
  if (await resume.count()) await resume.click();
  const legacyToolbarAbsent = !(await page.getByTestId("px4a-edit-toolbar").isVisible());
  const inspector = await page.getByTestId("px4a-photo-inspector").isVisible();
  const preview = await page.getByTestId("px4a-preview-dock").isVisible();
  const zoneClass = await page.getByTestId("px4a-edit-zone").getAttribute("class");
  await shot(page, "desktop");
  return {
    dpl: await dpl(page),
    legacyToolbarAbsent,
    inspector,
    preview,
    twoColumn: zoneClass?.includes("lg:grid-cols-2") ?? false,
    canvases: await canvasCount(page),
    standaloneSave: await page.getByTestId("px4a-save").isVisible(),
    itemFinish: await page.getByTestId("px4a-item-finish").count(),
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report: Record<string, unknown> = { startedAt: new Date().toISOString() };
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nl-NL" });
    const dPage = await desktop.newPage();
    report.desktop = await desktopJourney(dPage);
    await desktop.close();

    const m390 = await browser.newContext({
      ...devices["Pixel 5"],
      viewport: { width: 390, height: 844 },
      locale: "nl-NL",
    });
    const p390 = await m390.newPage();
    report.layout390 = await mobileLayout(p390);
    await shot(p390, "390-empty");
    report.edit390 = await editingJourney(p390);
    await m390.close();

    const m375 = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: "nl-NL" });
    const p375 = await m375.newPage();
    report.layout375 = await mobileLayout(p375);
    await shot(p375, "375-empty");
    await m375.close();

    const layout390 = report.layout390 as { overflow: number; canvases: number; actionsCovered: boolean };
    const layout375 = report.layout375 as { overflow: number; canvases: number; actionsCovered: boolean };
    const edit = report.edit390 as { inputValue: string; photo1Back: string; leakedOntoPhoto2: string; canvases: number };
    const desktopR = report.desktop as { canvases: number; twoColumn: boolean; legacyToolbarAbsent: boolean; inspector: boolean };
    report.status =
      layout390.overflow <= 8 &&
      layout375.overflow <= 8 &&
      !layout390.actionsCovered &&
      !layout375.actionsCovered &&
      layout390.canvases === 1 &&
      edit.canvases === 1 &&
      desktopR.canvases === 1 &&
      desktopR.twoColumn &&
      desktopR.legacyToolbarAbsent &&
      desktopR.inspector &&
      edit.inputValue === "IPHONE TEXT TEST" &&
      edit.photo1Back === "IPHONE TEXT TEST" &&
      edit.leakedOntoPhoto2 !== "IPHONE TEXT TEST"
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
