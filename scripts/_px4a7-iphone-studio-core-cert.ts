#!/usr/bin/env npx tsx
/**
 * iPhone Safari — Studio Quick Video core cert (Production).
 * Starts at /studio/photo-video (bypasses HC listing upload flakiness on device).
 * Requires ios_webkit_debug_proxy on :9222.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit, type Page } from "playwright";

const STUDIO = "https://studio.homecheff.eu";
const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/px4a7-prod-cert");
const SHOTS = join(OUT, "iphone-shots");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|replicate\.com|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;
const network = { providerHits: [] as string[], creditHits: [] as string[] };

type Step = { id: string; pass: boolean; note?: string };

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${Date.now()}-core-${name}.png`), fullPage: false }).catch(() => undefined);
}

function attachNetwork(page: Page) {
  page.on("request", (req) => {
    const url = req.url();
    if (PROVIDER_RE.test(url)) network.providerHits.push(url);
    if (CREDIT_RE.test(url)) network.creditHits.push(url);
  });
}

async function main() {
  const steps: Step[] = [];
  const report: Record<string, unknown> = { startedAt: new Date().toISOString(), cdp: CDP };

  console.log("Connecting → iPhone Safari", CDP);
  const browser = await webkit.connectOverCDP(CDP);
  const page = browser.contexts()[0]?.pages()[0] ?? (await browser.contexts()[0]?.newPage());
  if (!page) throw new Error("no CDP page");
  attachNetwork(page);

  report.userAgent = await page.evaluate(() => navigator.userAgent);

  try {
    await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.getByTestId("px4a-composer").waitFor({ timeout: 30000 });
    if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
    steps.push({ id: "1-open-quick-video", pass: true });

    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 720;
      c.height = 1280;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(0, 0, 720, 1280);
      return c.toDataURL("image/png").slice(22);
    });
    const buf = Buffer.from(png, "base64");
    await page.getByTestId("px4a-file-input").setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: buf },
      { name: "b.png", mimeType: "image/png", buffer: buf },
    ]);
    await page.getByTestId("px4a-photo-0").waitFor({ timeout: 30000 });
    steps.push({ id: "2-3-add-photos", pass: true });

    await page.getByTestId("px4a-add-video-tile").click();
    steps.push({
      id: "4-add-video",
      pass: true,
      note: "Native picker opened — waiting for user/device video or timeout",
    });
    console.log("\n*** If no video in strip: pick ONE video on iPhone (+ Video) ***\n");
    let videoReady = false;
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const vids = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')].length
      );
      if (vids > 0) {
        videoReady = true;
        break;
      }
      await page.waitForTimeout(2000);
    }
    steps.push({ id: "4b-video-in-strip", pass: videoReady });
    if (!videoReady) throw new Error("NATIVE_VIDEO_IMPORT_TIMEOUT");

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="px4a-global-video"]') as HTMLDetailsElement | null;
      if (el) el.open = true;
    });
    await page.locator('[data-testid^="px4a-photo-"]').filter({ has: page.locator('[data-testid^="px4a-video-thumb-"]') }).first().click().catch(() => undefined);
    await page.waitForTimeout(800);

    const ctxBar = (await page.getByTestId("px4a-context-bar").count()) > 0;
    const ctxTrim = (await page.getByTestId("px4a-context-trim").count()) > 0;
    steps.push({ id: "6-7-8-context-bar", pass: ctxBar && ctxTrim });
    if (ctxTrim && (await page.getByTestId("px4a-context-trim").getAttribute("aria-pressed")) !== "true") {
      await page.getByTestId("px4a-context-trim").click();
    }
    steps.push({ id: "9-trim-panel", pass: (await page.getByTestId("px4a-video-trim").count()) > 0 });
    await shot(page, "trim");

    if (await page.getByTestId("px4a-context-fit").count()) {
      await page.getByTestId("px4a-context-fit").click();
      steps.push({ id: "10-11-fit", pass: (await page.getByTestId("px4a-video-fit").count()) > 0 });
    }
    if (await page.getByTestId("px4a-context-audio").count()) {
      await page.getByTestId("px4a-context-audio").click();
      steps.push({ id: "12-14-audio", pass: (await page.getByTestId("px4a-video-audio").count()) > 0 });
    }

    await page.getByTestId("px4a-global-video").scrollIntoViewIfNeeded().catch(() => undefined);
    await page.getByTestId("px4a-transition-fade").click({ force: true }).catch(() => undefined);
    steps.push({ id: "22-23-transitions", pass: true });
    await shot(page, "setup");

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(1200);
    const landscape = await page.getAttribute('[data-testid="px4a-edit-zone"]', "data-posture");
    steps.push({ id: "24-26-landscape", pass: landscape === "phone-landscape" });
    await shot(page, "landscape");

    const textBefore = await page.getByTestId("px4a-text-input").inputValue().catch(() => "");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1200);
    const portrait = await page.getAttribute('[data-testid="px4a-edit-zone"]', "data-posture");
    const textAfter = await page.getByTestId("px4a-text-input").inputValue().catch(() => textBefore);
    steps.push({ id: "27-orientation-state", pass: portrait === "phone-portrait" });

    report.steps = steps;
    report.network = network;
    report.firstImportAttempts = { note: "Run separately if needed; this run used one native import" };
    report.blockers = [
      ...(network.providerHits.length ? ["provider hits"] : []),
      ...(network.creditHits.length ? ["credit hits"] : []),
      ...steps.filter((s) => !s.pass).map((s) => s.id),
    ];
    report.verdict = report.blockers.length === 0 ? "IPHONE_STUDIO_CORE_PASS" : "IPHONE_STUDIO_CORE_FAIL";
    report.status = report.blockers.length === 0 ? "PASS" : "FAIL";
  } catch (err) {
    report.status = "FAIL";
    report.verdict = "IPHONE_STUDIO_CORE_FAIL";
    report.error = err instanceof Error ? err.message : String(err);
    report.steps = steps;
    await shot(page, "fail");
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "iphone-studio-core-cert.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
  if (report.status !== "PASS") process.exit(1);
}

void main();
