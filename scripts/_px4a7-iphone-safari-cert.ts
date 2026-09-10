#!/usr/bin/env npx tsx
/**
 * PX.4A.7 — Real iPhone Safari certification via Playwright webkit.connectOverCDP
 * Requires: ios_webkit_debug_proxy on :9222, Web Inspector ON, Safari tab on device.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit, type Page } from "playwright";

const HC = "https://homecheff.eu";
const STUDIO = "https://studio.homecheff.eu";
const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/px4a7-prod-cert");
const FIX = join(OUT, "fixtures");
const SHOTS = join(OUT, "iphone-shots");
const FRAMES = join(OUT, "iphone-frames");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|replicate\.com|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;

type Report = Record<string, unknown>;

const network = {
  providerHits: [] as string[],
  creditHits: [] as string[],
  renderHits: [] as string[],
  handoffPosts: [] as string[],
};

function ff(args: string[]): string {
  return execFileSync("ffprobe", args, { encoding: "utf8" });
}

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
}

function frameHash(path: string): { r: number; g: number; b: number; hash: string } {
  const py = `
from PIL import Image
import hashlib, sys
im = Image.open(sys.argv[1]).convert('RGB')
px = im.getpixel((im.width//2, im.height//2))
h = hashlib.sha256(im.tobytes()).hexdigest()[:16]
print(f"{px[0]},{px[1]},{px[2]},{h}")
`;
  const out = execFileSync("python3", ["-c", py, path], { encoding: "utf8" }).trim();
  const [r, g, b, hash] = out.split(",");
  return { r: Number(r), g: Number(g), b: Number(b), hash };
}

function inspectMp4(path: string, sampleTimes: number[]) {
  const probe = JSON.parse(
    ff([
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      path,
    ])
  );
  const fmt = probe.format ?? {};
  const video = (probe.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === "video");
  const audio = (probe.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === "audio");
  const ftyp = readFileSync(path).slice(4, 8).toString("ascii") === "ftyp";
  mkdirSync(FRAMES, { recursive: true });
  const frames = sampleTimes.map((t) => {
    const fp = join(FRAMES, `iphone-t-${String(t).replace(".", "_")}.png`);
    ffmpeg(["-ss", String(t), "-i", path, "-frames:v", "1", fp]);
    return { t, ...frameHash(fp), path: fp };
  });
  const hashes = new Set(frames.map((f) => f.hash));
  return {
    bytes: Number(fmt.size ?? 0),
    ftyp,
    duration: Number(fmt.duration ?? 0),
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    frames,
    framesDiffer: hashes.size > 1,
  };
}

async function waitUntil(label: string, fn: () => Promise<boolean>, ms = 120_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await fn()) {
      console.log(`  ok: ${label}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`timeout: ${label}`);
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${Date.now()}-${name}.png`), fullPage: false }).catch(() => undefined);
}

function attachNetwork(page: Page): void {
  page.on("request", (req) => {
    const url = req.url();
    if (PROVIDER_RE.test(url)) network.providerHits.push(`${req.method()} ${url}`);
    if (CREDIT_RE.test(url)) network.creditHits.push(`${req.method()} ${url}`);
    if (/\/api\/.*render|server-ffmpeg|ffmpeg-static/i.test(url)) network.renderHits.push(`${req.method()} ${url}`);
    if (/\/api\/photo-video\/export-(handoff|upload)/.test(url) && req.method() === "POST") {
      network.handoffPosts.push(url);
    }
  });
}

async function stripItems(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="px4a-photo-"]')]
      .filter((el) => /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || ""))
      .map((el) => {
        const id = el.getAttribute("data-testid") || "";
        const isVideo = Boolean(el.querySelector('[data-testid^="px4a-video-thumb-"]'));
        return { id, isVideo, selected: el.getAttribute("aria-selected") === "true" };
      })
  );
}

async function videoIndices(page: Page): Promise<number[]> {
  const items = await stripItems(page);
  return items.map((it, i) => (it.isVideo ? i : -1)).filter((i) => i >= 0);
}

async function selectClipByKind(page: Page, kind: "video" | "photo", nth = 0): Promise<void> {
  await waitUntil(`select ${kind} #${nth}`, async () => {
    const items = await stripItems(page);
    const matches = items.map((it, i) => ({ ...it, i })).filter((it) => (kind === "video" ? it.isVideo : !it.isVideo));
    const target = matches[nth];
    if (!target) return false;
    await page.locator(`[data-testid="${target.id}"]`).click();
    await page.waitForTimeout(400);
    const sel = await page.evaluate((testId) => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      return el?.getAttribute("aria-selected") === "true";
    }, target.id);
    return sel;
  }, 30_000);
}

async function clickButtonMatching(page: Page, re: RegExp): Promise<boolean> {
  const btns = page.locator("button");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const text = ((await btns.nth(i).innerText()) || "").trim();
    if (re.test(text)) {
      await btns.nth(i).click();
      await page.waitForTimeout(450);
      return true;
    }
  }
  return false;
}

async function openStudioFromListing(page: Page): Promise<void> {
  const makeFree = page.locator('[data-testid="px4a-make-free-video"]');
  const replace = page.locator('[data-testid="px4a-replace-video"]');
  if (await makeFree.count()) {
    await makeFree.click();
    return;
  }
  if (await replace.count()) {
    await replace.scrollIntoViewIfNeeded();
    await replace.click();
    return;
  }
  throw new Error("No Maak gratis video or Vervangen CTA on listing form");
}

async function ensureListingFormReady(page: Page, title: string): Promise<void> {
  const onForm = async () =>
    (await page.locator('[data-testid="px4a-make-free-video"], [data-testid="px4a-replace-video"]').count()) > 0;

  if (await onForm()) {
    console.log("  ok: listing form already visible");
  } else {
    await wizardToListingForm(page);
    if (!(await onForm())) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
    }
    if (!(await onForm())) {
      throw new Error("listing form CTA not found after wizard");
    }
  }

  const titleBox = page.getByLabel("Titel", { exact: true });
  if (await titleBox.count()) await titleBox.fill(title);
  const price = page.locator('input[inputmode="decimal"]').first();
  if (await price.count()) {
    const val = await price.inputValue();
    if (!val.trim()) await price.fill("4.50");
  }
  const allergen = page.getByLabel(/allergeneninformatie gecontroleerd/i);
  if (await allergen.count()) {
    const checked = await allergen.isChecked().catch(() => false);
    if (!checked) {
      await allergen.click({ force: true }).catch(() => undefined);
    }
  }
}

async function wizardToListingForm(page: Page): Promise<void> {
  await clickButtonMatching(page, /Alleen noodzakelijk|Accepteer alle/i);
  await clickButtonMatching(page, /Nu niet/i);

  if (await page.getByText("Kies je rol").count()) {
    await clickButtonMatching(page, /Garden|Tuin/i);
  }
  await clickButtonMatching(page, /Ik bied iets aan/i);
  await clickButtonMatching(page, /Tuin & Natuur|Garden/i);

  if (await page.getByText("Kies een groep").count()) {
    const btns = page.locator("section button");
    const n = await btns.count();
    for (let i = 0; i < n; i++) {
      const text = ((await btns.nth(i).innerText()) || "").trim();
      if (text && !/Terug/i.test(text)) {
        await btns.nth(i).click();
        await page.waitForTimeout(400);
        break;
      }
    }
  }
  if (await page.getByText("Wat past hier het beste?").count()) {
    const btns = page.locator("section button");
    const n = await btns.count();
    for (let i = 0; i < n; i++) {
      const text = ((await btns.nth(i).innerText()) || "").trim();
      if (text && !/Terug|groep/i.test(text)) {
        await btns.nth(i).click();
        await page.waitForTimeout(300);
        break;
      }
    }
    await clickButtonMatching(page, /Verder/i);
  }
  for (let k = 0; k < 4; k++) await clickButtonMatching(page, /^Verder$/i);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
}

async function uploadListingPhotos(page: Page): Promise<void> {
  const photos = ["red", "green", "blue", "orange"].map((c) => join(FIX, `px4a7-photo-${c}.png`));
  for (const photo of photos) {
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(photo);
    await page.waitForTimeout(800);
  }
  await waitUntil("4 listing photos ready", async () => {
    const uploading = await page.getByText("Uploaden...").count();
    const uploaded = await page.getByText(/Geüploade foto's \(4\)|4\/\d+ foto/).count();
    const imgs = await page.evaluate(() => {
      try {
        const raw = JSON.parse(window.sessionStorage.getItem("hc-px4a-item-form:v1") || "{}");
        return raw?.images?.length ?? 0;
      } catch {
        return 0;
      }
    });
    return uploading === 0 && (uploaded > 0 || imgs >= 4);
  }, 120_000);
}

async function setDuration(page: Page, seconds: number): Promise<void> {
  const chip = page.getByTestId(`px4a-duration-${seconds}`);
  if (await chip.count()) {
    await chip.click();
    return;
  }
  await page.getByRole("button", { name: String(seconds) }).click();
}

async function inspectorState(page: Page) {
  return page.evaluate(() => ({
    contextBar: !!document.querySelector('[data-testid="px4a-context-bar"]'),
    contextTrim: !!document.querySelector('[data-testid="px4a-context-trim"]'),
    contextText: !!document.querySelector('[data-testid="px4a-context-text"]'),
    trim: !!document.querySelector('[data-testid="px4a-video-trim"]'),
    audio: !!document.querySelector('[data-testid="px4a-video-audio"]'),
    fit: !!document.querySelector('[data-testid="px4a-video-fit"]'),
    movementPhoto: !!document.querySelector('[data-testid="px4a-movement-photo"]'),
    posture: document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture") ?? null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvas: document.querySelectorAll('[data-testid="px4a-composer"] canvas').length,
    ua: navigator.userAgent,
  }));
}

async function waitForNativeVideoImport(page: Page, timeoutMs: number): Promise<boolean> {
  const before = await stripItems(page);
  const beforeVideos = before.filter((i) => i.isVideo).length;
  console.log(`\n*** PAUSE: Select ONE moving video on iPhone (+ Video → gallery/camera) ***`);
  console.log(`Waiting up to ${Math.round(timeoutMs / 1000)}s for new video clip in strip...\n`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const items = await stripItems(page);
    if (items.filter((i) => i.isVideo).length > beforeVideos) {
      console.log("  ok: iPhone video appeared in strip");
      return true;
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    startedAt: new Date().toISOString(),
    cdp: CDP,
    device: {
      name: "Sergio's iPhone",
      model: "iPhone12,1 (iPhone 11)",
      ios: "26.3.1",
    },
  };

  console.log("Connecting Playwright → iPhone Safari via", CDP);
  const browser = await webkit.connectOverCDP(CDP);
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("No page in CDP context");

  attachNetwork(page);
  report.initialUrl = page.url();
  report.userAgent = await page.evaluate(() => navigator.userAgent);

  const session = await page.evaluate(async () => {
    const r = await fetch("/api/auth/session", { credentials: "include" });
    return { status: r.status, user: (await r.json()).user?.email ?? null };
  });
  report.sellerAuth = session;

  try {
    // HomeCheff draft — reuse existing form or walk wizard
    if (!page.url().includes("/sell/new")) {
      await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    }
    await page.waitForTimeout(1200);

    const title = `PX.4A.7 iPhone — niet publiceren ${Date.now()}`;
    await ensureListingFormReady(page, title);

    const desc = page.getByLabel(/Omschrijving|Vertel wat je aanbiedt/);
    if (await desc.count()) await desc.first().fill("PX.4A.7 iPhone cert. Do not publish.");

    const hasFourPhotos = await page.evaluate(() => {
      try {
        const raw = JSON.parse(window.sessionStorage.getItem("hc-px4a-item-form:v1") || "{}");
        return (raw?.images?.length ?? 0) >= 4;
      } catch {
        return false;
      }
    });
    if (!hasFourPhotos) {
      await uploadListingPhotos(page);
    }
    report.listingPhotos = 4;
    await shot(page, "4-photos");

    await openStudioFromListing(page);
    await waitUntil("contextual studio", async () => {
      return page.url().includes("/studio/photo-video") && (await page.getByTestId("px4a-composer").count()) > 0;
    }, 90_000);

    report.studioEntry = {
      url: page.url(),
      fromItem: page.url().includes("from-item") || page.url().includes("studio.homecheff"),
      noStudioHome: !(await page.getByText(/Wat wil je maken/i).count()),
      backLink: await page.getByTestId("px4a-item-back").count(),
    };
    if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
    else if (await page.getByTestId("px4a-resume-continue").count()) {
      await page.getByTestId("px4a-resume-continue").click();
      await page.waitForTimeout(1500);
    }

    await shot(page, "studio-entry");

    // Native iPhone video import
    const existingVideos = (await stripItems(page)).filter((i) => i.isVideo).length;
    if (existingVideos === 0) {
      await page.getByTestId("px4a-add-video-tile").click();
      const imported = await waitForNativeVideoImport(page, 180_000);
      if (!imported) throw new Error("NATIVE_VIDEO_IMPORT_TIMEOUT — pick one video on iPhone");
    }
    report.videoImport = { nativePath: true, stripVideos: (await videoIndices(page)).length };

    // Select video → context bar trim (default on video select)
    await selectClipByKind(page, "video", 0);
    if (await page.getByTestId("px4a-context-trim").count()) {
      const pressed = await page.getByTestId("px4a-context-trim").getAttribute("aria-pressed");
      if (pressed !== "true") await page.getByTestId("px4a-context-trim").click();
    }
    await page.waitForTimeout(1000);
    report.inspectorBeforeTrim = await inspectorState(page);

    // Trim ~5s via end handle if present
    const trimEnd = page.getByTestId("px4a-video-trim-end");
    if (await trimEnd.count()) {
      const box = await trimEnd.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.35, box.y + box.height / 2);
      }
    }

    await setDuration(page, 15);
    await selectClipByKind(page, "video", 0);
    if (await page.getByTestId("px4a-context-text").count()) {
      const pressed = await page.getByTestId("px4a-context-text").getAttribute("aria-pressed");
      if (pressed !== "true") await page.getByTestId("px4a-context-text").click();
    }
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("IPHONE MIXED TEST");

    // Prefer Fade on iPhone for performance
    await page.getByTestId("px4a-transition-fade").click();
    report.transition = "fade";

    await page.waitForTimeout(2000);
    report.inspectorAfterSetup = await inspectorState(page);
    report.mobileUx = {
      overflow: report.inspectorAfterSetup.overflow,
      canvas: report.inspectorAfterSetup.canvas,
    };
    await shot(page, "ready-export");

    // Video gebruiken
    const attachStarted = Date.now();
    await page.getByTestId("px4a-item-finish").click();
    await waitUntil("homecheff return", async () => {
      return page.url().includes("/sell/new") && !page.url().includes("studio.homecheff");
    }, 240_000);

    await waitUntil("listing video ready", async () => {
      const draft = await page.evaluate(() => {
        let raw: { title?: string; images?: unknown[]; video?: { url?: string } | null } | null = null;
        try {
          raw = JSON.parse(window.sessionStorage.getItem("hc-px4a-item-form:v1") || "null");
        } catch {
          raw = null;
        }
        return {
          title: raw?.title || "",
          photoCount: raw?.images?.length ?? 0,
          videoUrl: raw?.video?.url || null,
          videoCount: document.querySelectorAll("video").length,
        };
      });
      report.homecheffDraft = draft;
      return Boolean(draft.videoUrl);
    }, 180_000);

    const draft = report.homecheffDraft as { title: string; photoCount: number; videoUrl: string; videoCount: number };
    report.homecheff = {
      attachWallMs: Date.now() - attachStarted,
      titlePreserved: draft.title.includes("PX.4A.7 iPhone"),
      photosKept: draft.photoCount >= 4,
      oneVideo: draft.videoCount <= 1,
      unpublished: page.url().includes("/sell/new"),
    };

    const attached = join(OUT, "iphone-attached.mp4");
    const res = await fetch(draft.videoUrl);
    if (!res.ok) throw new Error(`listing video download ${res.status}`);
    writeFileSync(attached, Buffer.from(await res.arrayBuffer()));
    report.mp4 = inspectMp4(attached, [1, 4, 8, 12]);
    report.network = network;

    const mp4 = report.mp4 as { ftyp?: boolean; videoCodec?: string; framesDiffer?: boolean; duration?: number };
    const blockers: string[] = [];
    if (!mp4.ftyp) blockers.push("ftyp missing");
    if (mp4.videoCodec !== "h264") blockers.push(`codec ${mp4.videoCodec}`);
    if (!mp4.framesDiffer) blockers.push("moving-frame proof failed");
    if (!(report.homecheff as { oneVideo?: boolean }).oneVideo) blockers.push("one-video law");
    if (network.providerHits.length) blockers.push("provider hits");
    if (network.creditHits.length) blockers.push("credit hits");
    report.blockers = blockers;
    report.verdict = blockers.length === 0 ? "IPHONE_PX4A7_PASS" : "IPHONE_PX4A7_FAIL";
    report.status = blockers.length === 0 ? "PASS" : "FAIL";
  } catch (err) {
    report.status = "FAIL";
    report.verdict = "IPHONE_PX4A7_FAIL";
    report.error = err instanceof Error ? err.message : String(err);
    await shot(page, "fail");
    report.failInspector = await inspectorState(page).catch(() => null);
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "iphone-cert.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (report.status !== "PASS") process.exit(1);
}

void main();
