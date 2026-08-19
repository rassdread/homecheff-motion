#!/usr/bin/env npx tsx
/**
 * Slice 1B local/production certification — viewport matrix + context-bar UX.
 * Chromium against STUDIO_BASE_URL (default: studio.homecheff.eu).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, type Browser, type Page } from "playwright";
import {
  clearDraftIfOffered,
  inspectorContextState,
  makeTestPng,
  mobileContextModelVisible,
  openContextAction,
  openPhotoVideoComposer,
  overflowPx,
  selectStripItem,
} from "./_px4a-cert-helpers";

const STUDIO = process.env.STUDIO_BASE_URL ?? "https://studio.homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/slice1b-cert");
const SHOTS = join(OUT, "shots");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|api\.openai|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;

const VIEWPORTS = [
  { id: "desktop-chromium", width: 1440, height: 900, landscape: false },
  { id: "portrait-390x844", width: 390, height: 844, landscape: false },
  { id: "portrait-375x667", width: 375, height: 667, landscape: false },
  { id: "portrait-430x932", width: 430, height: 932, landscape: false },
  { id: "landscape-844x390", width: 844, height: 390, landscape: true },
  { id: "landscape-812x375", width: 812, height: 375, landscape: true },
  { id: "landscape-932x430", width: 932, height: 430, landscape: true },
] as const;

const STANDARD_TRANSITIONS = ["cut", "fade", "slide", "wipe", "zoom_blend"] as const;
const SIGNATURE_TRANSITIONS = ["hc_shards", "hc_tiles", "hc_orbit", "hc_ripple", "hc_split", "hc_strips", "hc_lens"] as const;

type Report = Record<string, unknown>;

const network = { providerHits: [] as string[], creditHits: [] as string[] };

function gitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${Date.now()}-${name}.png`), fullPage: false }).catch(() => undefined);
}

function attachNetwork(page: Page) {
  page.on("request", (req) => {
    const url = req.url();
    if (PROVIDER_RE.test(url)) network.providerHits.push(`${req.method()} ${url}`);
    if (CREDIT_RE.test(url)) network.creditHits.push(`${req.method()} ${url}`);
  });
}

async function layoutProbe(page: Page, id: string) {
  const posture = await page.getByTestId("px4a-edit-zone").getAttribute("data-posture");
  const leftPane = await page.getByTestId("px4a-left-pane").isVisible().catch(() => false);
  const rightPane = await page.getByTestId("px4a-right-pane").isVisible().catch(() => false);
  const landscapeHeader = await page.getByTestId("px4a-landscape-header").isVisible().catch(() => false);
  const landscapeBody = await page.getByTestId("px4a-landscape-body").isVisible().catch(() => false);
  const contextModel = await mobileContextModelVisible(page);
  const globalTitle = await page.locator('[data-testid="px4a-global-video"] summary').getByText("Voor hele video").isVisible().catch(() => false);
  const overflow = await overflowPx(page);
  const canvases = await page.locator("[data-testid='px4a-composer'] canvas").count();
  await shot(page, id);
  const isLandscape = id.startsWith("landscape");
  const isDesktop = id.startsWith("desktop");
  return {
    posture,
    leftPane,
    rightPane,
    landscapeHeader,
    landscapeBody,
    contextModel,
    globalTitle,
    overflow,
    canvases,
    pass:
      overflow <= 8 &&
      canvases === 1 &&
      contextModel &&
      (isLandscape ? true : globalTitle) &&
      (isLandscape
        ? posture === "phone-landscape" && leftPane && rightPane && landscapeBody && landscapeHeader
        : isDesktop
          ? posture === "desktop"
          : posture === "phone-portrait"),
  };
}

async function transitionMatrix(page: Page) {
  await page.getByTestId("px4a-global-video").scrollIntoViewIfNeeded();
  await page.getByTestId("px4a-style").scrollIntoViewIfNeeded();
  const standard: Record<string, boolean> = {};
  const signature: Record<string, boolean> = {};
  for (const kind of STANDARD_TRANSITIONS) {
    const el = page.getByTestId(`px4a-transition-${kind}`);
    await el.scrollIntoViewIfNeeded().catch(() => undefined);
    standard[kind] = (await el.count()) > 0 && (await el.isVisible().catch(() => false));
  }
  for (const kind of SIGNATURE_TRANSITIONS) {
    const el = page.getByTestId(`px4a-transition-${kind}`);
    await el.scrollIntoViewIfNeeded().catch(() => undefined);
    signature[kind] = (await el.count()) > 0 && (await el.isVisible().catch(() => false));
  }
  const sigGroup = await page.getByTestId("px4a-transition-group-signature").innerText().catch(() => "");
  return {
    standard,
    signature,
    signatureGroupVisible: /Scherven|Shards|HomeCheff Studio/i.test(sigGroup),
    allStandard: Object.values(standard).every(Boolean),
    allSignature: Object.values(signature).every(Boolean),
  };
}

async function editingFlow(page: Page) {
  const a = await makeTestPng(page, "#c0392b");
  const b = await makeTestPng(page, "#2980b9");
  await page.getByTestId("px4a-file-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: a },
    { name: "b.png", mimeType: "image/png", buffer: b },
  ]);
  await page.getByTestId("px4a-photo-0").waitFor({ timeout: 20_000 });
  await selectStripItem(page, 0);
  await openContextAction(page, "text");
  await page.getByTestId("px4a-add-text").click();
  await page.getByTestId("px4a-text-input").fill("SLICE1B CERT");
  const textValue = await page.getByTestId("px4a-text-input").inputValue();
  await openContextAction(page, "motion");
  const motionVisible = await page.getByTestId("px4a-movement-photo").isVisible();
  await openContextAction(page, "order");
  const orderVisible = await page.getByTestId("px4a-order-panel").isVisible().catch(() => false);
  return { textValue, motionVisible, orderVisible };
}

async function orientationState(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="px4a-global-video"]') as HTMLDetailsElement | null;
    if (el) el.open = true;
  });
  await page.getByTestId("px4a-style").scrollIntoViewIfNeeded();
  const fade = page.getByTestId("px4a-transition-fade");
  await fade.scrollIntoViewIfNeeded();
  await fade.click({ force: true });
  await selectStripItem(page, 0);
  await openContextAction(page, "text");
  await page.getByTestId("px4a-text-input").fill("ORIENT");
  const portrait = await inspectorContextState(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(900);
  const landscape = await inspectorContextState(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const backPortrait = await inspectorContextState(page);
  const textAfter = await page.getByTestId("px4a-text-input").inputValue().catch(() => "");
  return {
    portrait,
    landscape,
    backPortrait,
    textPreserved: textAfter === "ORIENT",
    postureFlipped: landscape.posture === "phone-landscape" && backPortrait.posture === "phone-portrait",
  };
}

async function runViewport(browser: Browser, vp: (typeof VIEWPORTS)[number]) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    locale: "nl-NL",
    ...(vp.id === "portrait-390x844" ? devices["Pixel 5"] : {}),
  });
  const page = await context.newPage();
  attachNetwork(page);
  await openPhotoVideoComposer(page, STUDIO, true);
  const layout = await layoutProbe(page, vp.id);
  let edit: Report | null = null;
  let transitions: Report | null = null;
  let orientation: Report | null = null;
  if (vp.id === "desktop-chromium") {
    edit = await editingFlow(page);
    await page.getByTestId("px4a-global-video").scrollIntoViewIfNeeded();
    transitions = await transitionMatrix(page);
  }
  if (vp.id === "portrait-390x844") {
    edit = await editingFlow(page);
    orientation = await orientationState(page);
    await shot(page, "390-context-bar");
  }
  await context.close();
  return { layout, edit, transitions, orientation };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    startedAt: new Date().toISOString(),
    studioBaseUrl: STUDIO,
    commit: gitSha(),
    selectorMap: [
      { old: "px4a-edit-toolbar", new: "px4a-context-bar / px4a-context-none-helper", intent: "mobile edit actions", preserved: true },
      { old: "px4a-toolbar-clip", new: "px4a-context-trim", intent: "open trim", preserved: true },
      { old: "px4a-toolbar-text", new: "px4a-context-text", intent: "open text", preserved: true },
      { old: "px4a-toolbar-motion", new: "px4a-context-motion", intent: "open movement", preserved: true },
      { old: "px4a-toolbar-order", new: "px4a-context-order", intent: "reorder media", preserved: true },
      { old: "Instellingen voor de hele video", new: "Voor hele video", intent: "global settings discoverability", preserved: true },
    ],
    viewports: {} as Record<string, unknown>,
    network,
    physicalIphone: {
      available: false,
      note: "Physical iPhone CDP not attempted in this automated run; prior Aug 19 baseline IPHONE_PX4A7_PASS with resume-continue path.",
    },
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      console.log(`Cert viewport: ${vp.id}`);
      (report.viewports as Record<string, unknown>)[vp.id] = await runViewport(browser, vp);
    }

    const vps = report.viewports as Record<string, { layout: { pass: boolean }; transitions?: { allStandard: boolean; allSignature: boolean } }>;
    const allLayout = Object.values(vps).every((v) => v.layout.pass);
    const transitions = vps["desktop-chromium"]?.transitions;
    const orient = vps["portrait-390x844"]?.orientation as { textPreserved?: boolean; postureFlipped?: boolean } | undefined;
    const blockers: string[] = [];
    if (!allLayout) blockers.push("viewport layout gate");
    if (transitions && (!transitions.allStandard || !transitions.allSignature)) blockers.push("transition matrix");
    if (orient && (!orient.textPreserved || !orient.postureFlipped)) blockers.push("orientation state");
    if (network.providerHits.length) blockers.push("FREE_LOCAL provider hits");
    if (network.creditHits.length) blockers.push("credit hits");

    report.blockers = blockers;
    report.verdict = blockers.length === 0 ? "SLICE1B_AUTOMATED_PASS" : "SLICE1B_AUTOMATED_FAIL";
    report.status = blockers.length === 0 ? "PASS" : "FAIL";
  } catch (err) {
    report.status = "FAIL";
    report.verdict = "SLICE1B_AUTOMATED_FAIL";
    report.error = err instanceof Error ? err.message : String(err);
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "cert-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
  if (report.status !== "PASS") process.exit(1);
}

void main();
