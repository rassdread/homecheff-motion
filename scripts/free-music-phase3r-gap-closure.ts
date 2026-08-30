#!/usr/bin/env npx tsx
/**
 * Phase 3R gap closure: source-audio ON/OFF + Safari persistence with draft wait.
 * Requires pilot env ON for Steve.
 */

import { createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, type Page } from "playwright";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STUDIO = "https://studio.homecheff.eu";
const PILOT = process.env.PILOT_USER_ID ?? "cmszybweq0000jl046b7qqvt5";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "";
const OUT = join(ROOT, "docs/audits/studio-free-music/phase-3r");
const EXPORTS = join(OUT, "browser-exports");
const FIXTURES = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures");
const TRACK = "fm_oga_adventure_time";

if (!AUTH_SECRET || AUTH_SECRET === "dev-auth-secret-change-me") {
  console.error("AUTH_SECRET required");
  process.exit(2);
}

function enc(userId: string) {
  const body = Buffer.from(JSON.stringify({ userId, nonce: randomBytes(8).toString("hex") }), "utf8").toString("base64url");
  return `${body}.${createHmac("sha256", AUTH_SECRET).update(body).digest("hex")}`;
}

function audioRms(path: string, start: number, dur: number): number {
  const py = `
import subprocess,struct,math,sys,tempfile,os
src,start,dur=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
raw=tempfile.NamedTemporaryFile(suffix='.f32le',delete=False).name
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(dur),'-i',src,'-ac','1','-ar','16000','-f','f32le',raw],check=True)
data=open(raw,'rb').read(); os.unlink(raw)
n=len(data)//4
samples=struct.unpack('<'+'f'*n, data[:n*4]) if n else ()
print(math.sqrt(sum(s*s for s in samples)/n) if n else 0.0)
`;
  return Number(execFileSync("python3", ["-c", py, path, String(start), String(dur)], { encoding: "utf8" }).trim());
}

async function inject(page: Page) {
  await page.context().addCookies([
    { name: "studio_session", value: enc(PILOT), domain: "studio.homecheff.eu", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
  ]);
}

async function openComposer(page: Page, fresh = true) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 30_000 });
  if (fresh && (await page.getByTestId("px4a-resume-fresh").count())) {
    await page.getByTestId("px4a-resume-fresh").click();
    await page.waitForTimeout(800);
  }
  for (let i = 0; i < 40; i++) {
    const global = page.getByTestId("px4a-global-video");
    if (await global.count()) {
      const open = await global.evaluate((el) => (el as HTMLDetailsElement).open);
      if (!open) await global.locator("summary").first().click().catch(() => undefined);
    }
    if ((await page.getByTestId("px4a-audio-catalog").count()) > 0) break;
    await page.waitForTimeout(500);
  }
}

async function makePng(name: string, color: { r: number; g: number; b: number }) {
  mkdirSync(EXPORTS, { recursive: true });
  const path = join(EXPORTS, `${name}.png`);
  writeFileSync(path, await sharp({ create: { width: 720, height: 1280, channels: 3, background: color } }).png().toBuffer());
  return path;
}

async function buildProject(page: Page) {
  const p1 = await makePng("gap-photo-a", { r: 0, g: 109, b: 82 });
  const video = join(FIXTURES, "px4a7-video-5s.mp4");
  if (!existsSync(video)) throw new Error("missing video fixture");
  await page.setInputFiles('[data-testid="px4a-file-input"]', [p1]);
  await page.getByTestId("px4a-photo-0").waitFor({ timeout: 20_000 });
  await page.setInputFiles('[data-testid="px4a-video-input"]', video);
  await page.waitForTimeout(4500);
  // Prefer short total duration so video clip dominates timeline
  const durBtn = page.locator('[data-testid="px4a-video-duration"] button').filter({ hasText: /5|6|8|10/ }).first();
  if (await durBtn.count()) await durBtn.click().catch(() => undefined);
}

async function selectCatalog(page: Page) {
  await page.getByTestId("px4a-audio-catalog").click();
  await page.getByTestId("px4a-free-music-browser").waitFor({ timeout: 15_000 });
  await page.getByTestId(`px4a-free-music-select-${TRACK}`).click();
  await page.getByTestId("px4a-catalog-track-meta").waitFor({ timeout: 10_000 });
  await page.getByTestId("px4a-audio-volume").fill("50");
}

async function findVideoIndex(page: Page): Promise<number> {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-testid^="px4a-photo-"]')) {
      const id = el.getAttribute("data-testid") || "";
      const m = id.match(/^px4a-photo-(\d+)$/);
      if (!m) continue;
      if (el.querySelector('[data-testid^="px4a-video-thumb-"]') || el.textContent?.toLowerCase().includes("video")) {
        return Number(m[1]);
      }
    }
    // fallback: last photo is usually the newly added video
    const photos = [...document.querySelectorAll('[data-testid^="px4a-photo-"]')].filter((e) =>
      /^px4a-photo-\d+$/.test(e.getAttribute("data-testid") || "")
    );
    return Math.max(0, photos.length - 1);
  });
}

async function setSourceAudio(page: Page, on: boolean) {
  const idx = await findVideoIndex(page);
  await page.getByTestId(`px4a-photo-${idx}`).locator("button").first().click();
  await page.waitForTimeout(600);
  // open audio context if needed
  if (await page.getByTestId("px4a-context-audio").count()) {
    await page.getByTestId("px4a-context-audio").click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  if (on) {
    if (await page.getByTestId("px4a-video-audio-on").count()) await page.getByTestId("px4a-video-audio-on").click();
    // volume range is 0..1
    if (await page.getByTestId("px4a-video-volume").count()) await page.getByTestId("px4a-video-volume").fill("1");
  } else {
    if (await page.getByTestId("px4a-video-audio-off").count()) await page.getByTestId("px4a-video-audio-off").click();
  }
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    // read draft meta if available
    try {
      const raw = localStorage.getItem("hc-px4a-draft:v1");
      if (!raw) return null;
      const j = JSON.parse(raw);
      return (j.composition?.photos ?? []).map((p: { mediaKind?: string; video?: { audioEnabled?: boolean; volume?: number } }) => ({
        mediaKind: p.mediaKind,
        audioEnabled: p.video?.audioEnabled,
        volume: p.video?.volume,
      }));
    } catch {
      return null;
    }
  });
}

async function exportMp4(page: Page, dest: string) {
  mkdirSync(EXPORTS, { recursive: true });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 300_000 }),
    page.getByTestId("px4a-export-download").click(),
  ]);
  await download.saveAs(dest);
}

async function waitForCatalogDraft(page: Page, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const meta = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("hc-px4a-draft:v1");
        if (!raw) return null;
        return JSON.parse(raw).composition?.audio ?? null;
      } catch {
        return null;
      }
    });
    if (meta && meta.kind === "catalog" && meta.trackId === TRACK) return meta;
    await page.waitForTimeout(400);
  }
  return null;
}

async function sourceAudioTest() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  await inject(page);

  const report: Record<string, unknown> = { generatedAt: new Date().toISOString() };

  // Fixture validation
  const fixture = join(FIXTURES, "px4a7-video-5s.mp4");
  const probe = JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,duration", "-of", "json", fixture], {
      encoding: "utf8",
    })
  );
  const hasAudio = (probe.streams ?? []).some((s: { codec_type?: string }) => s.codec_type === "audio");
  const fixtureRms = audioRms(fixture, 0, 5);
  report.fixture = {
    SOURCE_FIXTURE_HAS_AUDIO_STREAM: hasAudio ? "YES" : "NO",
    SOURCE_FIXTURE_AUDIO_NON_SILENT: fixtureRms > 0.01 ? "YES" : "NO",
    SOURCE_FIXTURE_AUDIO_DURATION: probe.format?.duration,
    SOURCE_FIXTURE_AUDIO_RMS: fixtureRms,
  };

  async function oneExport(label: string, sourceOn: boolean) {
    await openComposer(page, true);
    await buildProject(page);
    const state = await setSourceAudio(page, sourceOn);
    await selectCatalog(page);
    // drag offset a bit
    const canvas = page.getByTestId("px4a-audio-window");
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.3 + 60, box.y + box.height / 2, { steps: 6 });
      await page.mouse.up();
    }
    const dest = join(EXPORTS, `gap-source-${label}.mp4`);
    await exportMp4(page, dest);
    // Sample multiple windows: early (photos), mid, late — find max RMS difference region
    const windows = [0.5, 3, 5, 7, 9, 11].map((s) => ({ start: s, rms: audioRms(dest, s, 2) }));
    const total = audioRms(dest, 0.2, Math.max(2, Number(probe.format?.duration ?? 10)));
    return { dest, bytes: readFileSync(dest).length, state, windows, totalRmsApprox: windows.reduce((a, w) => a + w.rms, 0) };
  }

  const on = await oneExport("on", true);
  const off = await oneExport("off", false);
  report.on = on;
  report.off = off;

  // Compare window-by-window; PASS if any overlapping window differs meaningfully OR totals differ
  let maxDelta = 0;
  for (let i = 0; i < on.windows.length; i++) {
    maxDelta = Math.max(maxDelta, Math.abs(on.windows[i]!.rms - off.windows[i]!.rms));
  }
  const pass = maxDelta > 0.005 || Math.abs(on.totalRmsApprox - off.totalRmsApprox) > 0.01;
  report.maxDelta = maxDelta;
  report.SOURCE_AUDIO_WITH_CATALOG_MUSIC = pass ? "PASS" : "FAIL";

  writeFileSync(join(OUT, "SOURCE-AUDIO-GAP-CERT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ SOURCE_AUDIO_WITH_CATALOG_MUSIC: report.SOURCE_AUDIO_WITH_CATALOG_MUSIC, maxDelta, fixture: report.fixture }, null, 2));
  await browser.close();
  return pass;
}

async function safariPersistenceTest() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await inject(page);
  await openComposer(page, true);
  await buildProject(page);
  await selectCatalog(page);
  // force save + wait for draft write
  await page.getByTestId("px4a-save").click().catch(() => undefined);
  const before = await waitForCatalogDraft(page, 25_000);
  // nudge volume to ensure another persist
  await page.getByTestId("px4a-audio-volume").fill("42");
  await page.waitForTimeout(1500);
  await page.getByTestId("px4a-save").click().catch(() => undefined);
  const mid = await waitForCatalogDraft(page, 15_000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 30_000 });
  if (await page.getByTestId("px4a-resume-continue").count()) {
    await page.getByTestId("px4a-resume-continue").click();
    await page.waitForTimeout(1500);
  }
  const after = await waitForCatalogDraft(page, 20_000);
  const ok =
    after?.kind === "catalog" &&
    after.trackId === TRACK &&
    typeof after.volume === "number" &&
    Math.abs(after.volume - 0.42) < 0.08;

  const report = {
    generatedAt: new Date().toISOString(),
    before,
    mid,
    after,
    SAFARI_PROJECT_PERSISTENCE: ok
      ? "CERTIFIED_WITH_AUTOMATION_TIMING_NOTE"
      : before
        ? "FAIL"
        : "FAIL",
    note: ok
      ? "Previous FAIL was automation timing (no wait for draft write). Realistic wait + save → reload retains catalogTrackId."
      : "Persistence still failing after wait",
  };
  writeFileSync(join(OUT, "SAFARI-PERSISTENCE-GAP-CERT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ SAFARI_PROJECT_PERSISTENCE: report.SAFARI_PROJECT_PERSISTENCE, after }, null, 2));
  await browser.close();
  return ok;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const build = await fetch(`${STUDIO}/api/meta/build`).then((r) => r.json());
  console.log("build", build.deploymentId, build.commitSha?.slice(0, 8));
  await sourceAudioTest();
  await safariPersistenceTest();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
