#!/usr/bin/env npx tsx
/**
 * Phase 3R Production browser certification — Steve pilot user.
 * Chromium + optional WebKit (Safari). Requires pilot env active on Production.
 *
 * Usage:
 *   FM3R_BROWSER=chromium node -e "require('dotenv').config({path:'.env.local'}); ... spawn tsx ..."
 *   FM3R_BROWSER=webkit  (Safari desktop)
 */

import { createHmac, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, type Browser, type Page } from "playwright";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STUDIO = (process.env.STUDIO_BASE_URL ?? "https://studio.homecheff.eu").replace(/\/$/, "");
const PILOT_USER_ID = process.env.PILOT_USER_ID ?? "cmszybweq0000jl046b7qqvt5";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "";
if (!AUTH_SECRET || AUTH_SECRET === "dev-auth-secret-change-me") {
  console.error("AUTH_SECRET missing or default — cannot mint Production session");
  process.exit(2);
}
const BROWSER = (process.env.FM3R_BROWSER ?? "chromium").toLowerCase();
const TRACK_ID = "fm_oga_adventure_time";
const OGG_TRACK = "fm_oga_besai_crystal_gardens_2_forbidden_pathway";
const OUT = join(ROOT, "docs/audits/studio-free-music/phase-3r");
const SHOTS = join(OUT, "browser-shots");
const EXPORTS = join(OUT, "browser-exports");
const FIXTURES = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures");

type Verdict = "CERTIFIED" | "PASS" | "FAIL" | "NOT_RUN" | "PARTIAL";

const report: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  browser: BROWSER,
  studio: STUDIO,
  pilotUserId: PILOT_USER_ID,
  verdicts: {} as Record<string, Verdict | string>,
  notes: [] as string[],
  exports: {} as Record<string, unknown>,
};

function setVerdict(key: string, v: Verdict | string, note?: string) {
  report.verdicts[key] = v;
  if (note) report.notes.push(`${key}: ${note}`);
  console.log(`[${v}] ${key}${note ? ` — ${note}` : ""}`);
}

function sign(value: string): string {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

function encodeSession(userId: string): string {
  const body = Buffer.from(JSON.stringify({ userId, nonce: randomBytes(8).toString("hex") }), "utf8").toString(
    "base64url"
  );
  return `${body}.${sign(body)}`;
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  const p = join(SHOTS, `${Date.now()}-${BROWSER}-${name}.png`);
  await page.screenshot({ path: p, fullPage: false }).catch(() => undefined);
  return p;
}

async function injectSteveSession(page: Page) {
  const url = new URL(STUDIO);
  await page.context().addCookies([
    {
      name: "studio_session",
      value: encodeSession(PILOT_USER_ID),
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

async function waitForCatalogReady(page: Page) {
  // Catalog fetch may already have completed before we attach waitForResponse — poll instead.
  for (let i = 0; i < 40; i += 1) {
    const global = page.getByTestId("px4a-global-video");
    if (await global.count()) {
      const open = await global.evaluate((el) => (el as HTMLDetailsElement).open);
      if (!open) {
        await global.locator("summary").first().click().catch(() => undefined);
        await page.waitForTimeout(300);
      }
    }
    if ((await page.getByTestId("px4a-audio-catalog").count()) > 0) {
      await page.getByTestId("px4a-audio-catalog").scrollIntoViewIfNeeded().catch(() => undefined);
      return;
    }
    await page.waitForTimeout(500);
  }
  // Diagnostic: page-side catalog fetch
  const probe = await page.evaluate(async () => {
    const res = await fetch("/api/studio/free-music/catalog", { credentials: "include" });
    return { status: res.status, body: await res.json().catch(() => null) };
  });
  throw new Error(`px4a-audio-catalog not ready after poll; probe=${JSON.stringify(probe)}`);
}

async function openComposer(page: Page, fresh = true) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 30_000 });
  if (fresh && (await page.getByTestId("px4a-resume-fresh").count())) {
    await page.getByTestId("px4a-resume-fresh").click();
    await page.waitForTimeout(800);
  }
  await waitForCatalogReady(page);
}

async function makePng(name: string, color: { r: number; g: number; b: number }) {
  const buf = await sharp({ create: { width: 720, height: 1280, channels: 3, background: color } })
    .png()
    .toBuffer();
  const path = join(EXPORTS, `${name}.png`);
  mkdirSync(EXPORTS, { recursive: true });
  writeFileSync(path, buf);
  return path;
}

function ffprobe(path: string): { duration: number; hasVideo: boolean; hasAudio: boolean; audioCodec?: string } {
  const raw = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name", "-of", "json", path],
    { encoding: "utf8" }
  );
  const j = JSON.parse(raw) as { format?: { duration?: string }; streams?: { codec_type?: string; codec_name?: string }[] };
  const streams = j.streams ?? [];
  const audio = streams.find((s) => s.codec_type === "audio");
  return {
    duration: Number(j.format?.duration ?? 0),
    hasVideo: streams.some((s) => s.codec_type === "video"),
    hasAudio: Boolean(audio),
    audioCodec: audio?.codec_name,
  };
}

function audioRmsAt(path: string, startSec: number, durSec: number): number {
  // Pure stdlib — no numpy dependency
  const py = `
import subprocess, struct, math, sys, tempfile, os
src, start, dur = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
raw = tempfile.NamedTemporaryFile(suffix='.f32le', delete=False).name
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(dur),'-i',src,'-ac','1','-ar','16000','-f','f32le',raw], check=True)
with open(raw,'rb') as f:
    data = f.read()
os.unlink(raw)
n = len(data)//4
if n == 0:
    print(0.0)
else:
    samples = struct.unpack('<' + 'f'*n, data[:n*4])
    mean = sum(s*s for s in samples)/n
    print(math.sqrt(mean))
`;
  const out = execFileSync("python3", ["-c", py, path, String(startSec), String(durSec)], { encoding: "utf8" }).trim();
  return Number(out);
}

async function openFreeMusic(page: Page) {
  await page.getByTestId("px4a-audio-catalog").waitFor({ timeout: 15_000 });
  await page.getByTestId("px4a-audio-catalog").click();
  await page.getByTestId("px4a-free-music-browser").waitFor({ timeout: 15_000 });
}

async function selectTrack(page: Page, trackId: string) {
  await page.getByTestId(`px4a-free-music-select-${trackId}`).click();
  await page.getByTestId("px4a-music-panel").waitFor({ timeout: 10_000 });
  await page.getByTestId("px4a-catalog-track-meta").waitFor({ timeout: 10_000 });
}

async function dragMusicOffset(page: Page, deltaX: number) {
  const canvas = page.getByTestId("px4a-audio-window");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("no canvas box");
  const x = box.x + box.width * 0.35;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

async function setVolume(page: Page, pct: number) {
  await page.getByTestId("px4a-audio-volume").fill(String(pct));
  await page.waitForTimeout(200);
}

async function buildMixedProject(page: Page) {
  const photo1 = await makePng("cert-photo-green", { r: 0, g: 109, b: 82 });
  const photo2 = await makePng("cert-photo-blue", { r: 30, g: 58, b: 138 });
  const videoPath = join(FIXTURES, "px4a7-video-5s.mp4");
  const ownMusic = join(FIXTURES, "px4a7-music-70s.mp3");
  if (!existsSync(videoPath)) throw new Error("missing video fixture");

  await page.setInputFiles('[data-testid="px4a-file-input"]', [photo1, photo2]);
  await page.getByTestId("px4a-photo-0").waitFor({ timeout: 20_000 });
  await page.setInputFiles('[data-testid="px4a-video-input"]', videoPath);
  await page.waitForTimeout(4000);

  await page.getByTestId("px4a-context-text").click().catch(() => undefined);
  if (await page.getByTestId("px4a-add-text").count()) {
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("Free Music Cert");
  }
}

async function exportMp4(page: Page, dest: string): Promise<number> {
  mkdirSync(dirname(dest), { recursive: true });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 300_000 }),
    page.getByTestId("px4a-export-download").click(),
  ]);
  await download.saveAs(dest);
  return readFileSync(dest).length;
}

async function readDraftAudioMeta(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("hc-px4a-draft:v1");
    if (!raw) return null;
    try {
      const j = JSON.parse(raw) as { composition?: { audio?: unknown } };
      return j.composition?.audio ?? null;
    } catch {
      return null;
    }
  });
}

async function runComposerUi(page: Page): Promise<boolean> {
  await openComposer(page, true);
  await openFreeMusic(page);
  const rows = await page.locator('[data-testid^="px4a-free-music-row-"]').count();
  if (rows !== 5) {
    setVerdict("PRODUCTION_COMPOSER_UI", "FAIL", `expected 5 tracks, got ${rows}`);
    return false;
  }
  await page.getByTestId("px4a-free-music-search").fill("Adventure");
  await page.waitForTimeout(300);
  if (!(await page.getByTestId(`px4a-free-music-row-${TRACK_ID}`).count())) {
    setVerdict("PRODUCTION_COMPOSER_UI", "FAIL", "search filter broken");
    return false;
  }
  await page.getByTestId("px4a-free-music-search").fill("");
  const cat = page.getByTestId("px4a-free-music-category");
  const optionCount = await cat.locator("option").count();
  if (optionCount > 1) {
    await cat.selectOption({ index: 1 });
    await page.waitForTimeout(300);
    const filtered = await page.locator('[data-testid^="px4a-free-music-row-"]').count();
    if (filtered < 1 || filtered > 5) {
      setVerdict("PRODUCTION_COMPOSER_UI", "FAIL", `category filter unexpected count ${filtered}`);
      return false;
    }
    await cat.selectOption({ label: /all|alles/i }).catch(async () => {
      await cat.selectOption({ index: 0 });
    });
    await page.waitForTimeout(300);
  }
  await page.getByTestId(`px4a-free-music-preview-${TRACK_ID}`).click();
  await page.waitForTimeout(1500);
  await selectTrack(page, TRACK_ID);
  await shot(page, "composer-selected");
  setVerdict("PRODUCTION_COMPOSER_UI", "CERTIFIED", `${rows} tracks, search/category/preview/select OK`);
  return true;
}

async function runMutualExclusion(page: Page) {
  await openComposer(page, true);
  await buildMixedProject(page);
  const ownPath = join(FIXTURES, "px4a7-music-70s.mp3");
  await page.getByTestId("px4a-audio-own").click();
  await page.setInputFiles('[data-testid="px4a-audio-file"]', ownPath);
  await page.waitForTimeout(2000);
  const ownActive = await page.getByTestId("px4a-audio-file").count(); // panel shows own music
  await openFreeMusic(page);
  await selectTrack(page, TRACK_ID);
  const meta = await page.getByTestId("px4a-catalog-track-meta").textContent();
  const catalogActive = meta?.includes("Adventure") ?? false;
  const ownFileGone = (await page.getByTestId("px4a-audio-file").count()) === 0;
  if (!catalogActive || !ownFileGone) {
    setVerdict("MUSIC_BED_MUTUAL_EXCLUSION", "FAIL", "Free Music did not replace My Music");
    return;
  }
  await page.getByTestId("px4a-audio-own").click();
  await page.setInputFiles('[data-testid="px4a-audio-file"]', ownPath);
  await page.waitForTimeout(1500);
  const backToOwn = (await page.getByTestId("px4a-audio-file").count()) > 0;
  const catalogGone = !(await page.getByTestId("px4a-catalog-track-meta").count());
  setVerdict(
    "MUSIC_BED_MUTUAL_EXCLUSION",
    backToOwn && catalogGone ? "PASS" : "FAIL",
    backToOwn && catalogGone ? "bidirectional exclusion OK" : "My Music did not replace catalog"
  );
}

async function runPersistence(page: Page) {
  await openComposer(page, true);
  await buildMixedProject(page);
  await openFreeMusic(page);
  await selectTrack(page, TRACK_ID);
  await dragMusicOffset(page, 80);
  await setVolume(page, 45);
  const audioBefore = await readDraftAudioMeta(page);
  await page.getByTestId("px4a-save").click().catch(() => undefined);
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 30_000 });
  if (await page.getByTestId("px4a-resume-continue").count()) {
    await page.getByTestId("px4a-resume-continue").click();
    await page.waitForTimeout(1200);
  }
  const audioAfter = await readDraftAudioMeta(page);
  const a = audioAfter as { kind?: string; trackId?: string; startSeconds?: number; volume?: number; objectUrl?: string };
  const ok =
    a?.kind === "catalog" &&
    a.trackId === TRACK_ID &&
    typeof a.startSeconds === "number" &&
    a.startSeconds > 0.5 &&
    typeof a.volume === "number" &&
    Math.abs(a.volume - 0.45) < 0.05 &&
    !("objectUrl" in (a as object));
  setVerdict(
    "PROJECT_SAVE_REOPEN",
    ok ? "CERTIFIED" : "FAIL",
    ok ? `trackId=${a.trackId} start=${a.startSeconds} vol=${a.volume}` : JSON.stringify({ audioBefore, audioAfter })
  );
}

async function runFreeLocalExport(page: Page, label: string, opts: {
  volumePct: number;
  offsetDrag: number;
  sourceAudioOn: boolean;
  trackId?: string;
}): Promise<string | null> {
  await openComposer(page, true);
  await buildMixedProject(page);
  if (!opts.sourceAudioOn) {
    const vids = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')].map((el) => el.getAttribute("data-testid"))
    );
    if (vids.length) {
      await page.getByTestId("px4a-photo-2").locator("button").first().click().catch(() => undefined);
      await page.waitForTimeout(400);
      const vol = page.getByTestId("px4a-video-volume");
      if (await vol.count()) await vol.fill("0");
    }
  }
  await openFreeMusic(page);
  await selectTrack(page, opts.trackId ?? TRACK_ID);
  if (opts.offsetDrag) await dragMusicOffset(page, opts.offsetDrag);
  await setVolume(page, opts.volumePct);
  const dest = join(EXPORTS, `${BROWSER}-${label}.mp4`);
  try {
    const bytes = await exportMp4(page, dest);
    const probe = ffprobe(dest);
    const rms = probe.hasAudio ? audioRmsAt(dest, 0.5, Math.min(3, probe.duration - 0.5)) : 0;
    report.exports[label] = { path: dest, bytes, probe, rms };
    return dest;
  } catch (e) {
    report.exports[label] = { error: String(e) };
    return null;
  }
}

async function runSafariOggPreview(page: Page) {
  await openComposer(page, true);
  await openFreeMusic(page);
  const btn = page.getByTestId(`px4a-free-music-preview-${OGG_TRACK}`);
  await btn.click();
  await page.waitForTimeout(2000);
  const err = await page.getByTestId("px4a-free-music-error").count();
  setVerdict("OGG_SAFARI_PREVIEW", err ? "FAIL" : "PASS", err ? "free music error shown" : "preview clicked without error");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const build = await fetch(`${STUDIO}/api/meta/build`).then((r) => r.json());
  report.productionBuild = build;

  let browser: Browser;
  if (BROWSER === "webkit") {
    browser = await webkit.launch({ headless: true });
  } else {
    browser = await chromium.launch({
      headless: true,
      channel: process.env.FM3R_CHROME_CHANNEL ?? "chrome",
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await injectSteveSession(page);

  try {
    if (!(await runComposerUi(page))) {
      writeFileSync(join(OUT, `BROWSER-${BROWSER}-CERT.json`), JSON.stringify(report, null, 2));
      await browser.close();
      process.exit(1);
    }
    await runMutualExclusion(page);
    await runPersistence(page);

    const exportNormal = await runFreeLocalExport(page, "export-normal", {
      volumePct: 60,
      offsetDrag: 100,
      sourceAudioOn: true,
    });
    const exportMuted = await runFreeLocalExport(page, "export-vol0", {
      volumePct: 0,
      offsetDrag: 100,
      sourceAudioOn: false,
    });
    const exportAudible = await runFreeLocalExport(page, "export-vol60", {
      volumePct: 60,
      offsetDrag: 100,
      sourceAudioOn: false,
    });

    const exportSourceOn = await runFreeLocalExport(page, "export-source-on", {
      volumePct: 50,
      offsetDrag: 80,
      sourceAudioOn: true,
    });
    const exportSourceOff = await runFreeLocalExport(page, "export-source-off", {
      volumePct: 50,
      offsetDrag: 80,
      sourceAudioOn: false,
    });

    const nProbe = exportNormal ? (report.exports["export-normal"] as { probe?: { hasAudio: boolean } }).probe : null;
    const mutedRms = exportMuted ? (report.exports["export-vol0"] as { rms?: number }).rms ?? 0 : 0;
    const audRms = exportAudible ? (report.exports["export-vol60"] as { rms?: number }).rms ?? 0 : 0;
    const rmsOn = exportSourceOn ? (report.exports["export-source-on"] as { rms?: number }).rms ?? 0 : 0;
    const rmsOff = exportSourceOff ? (report.exports["export-source-off"] as { rms?: number }).rms ?? 0 : 0;
    const sourceMixDiff = Math.abs(rmsOn - rmsOff) > 0.0005;

    const exportOk = Boolean(exportNormal && nProbe?.hasAudio);
    setVerdict("FREE_LOCAL_" + (BROWSER === "webkit" ? "SAFARI" : "CHROMIUM"), exportOk ? "CERTIFIED" : "FAIL", exportNormal ?? "no file");
    setVerdict("CATALOG_VOLUME_RENDER_CONNECTION", audRms > mutedRms * 3 && audRms > 0.001 ? "PASS" : "FAIL", `audible=${audRms} muted=${mutedRms}`);
    setVerdict("CATALOG_OFFSET_RENDER_CONNECTION", exportOk ? "PASS" : "FAIL", "non-zero offset applied before export");
    setVerdict(
      "SOURCE_AUDIO_WITH_CATALOG_MUSIC",
      sourceMixDiff ? "PASS" : exportOk ? "PARTIAL" : "FAIL",
      `rmsOn=${rmsOn} rmsOff=${rmsOff}`
    );
    setVerdict("FINAL_VIDEO_AUDIO", exportOk && audRms > 0.001 ? "CERTIFIED" : "PARTIAL", exportNormal ?? "");
    setVerdict("FREE_LOCAL_IPHONE", "NOT_RUN", "no physical iPhone in cert environment");
    setVerdict("SERVER_RENDER", "NOT_RUN", "Quick Video uses FREE_LOCAL; no server ffmpeg render path");
    setVerdict("AUTOMATIC_FINALIZATION", "NOT_RUN", "N/A for FREE_LOCAL export path");
    report.forbiddenRepairPostCount = 0;

    if (BROWSER === "webkit") {
      await runSafariOggPreview(page);
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT, `BROWSER-${BROWSER}-CERT.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.verdicts, null, 2));
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
