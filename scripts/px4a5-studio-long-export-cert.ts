#!/usr/bin/env npx tsx
/**
 * PX.4A.5 — standalone Studio 45s / 60s Production download cert (Chrome).
 * Does not publish. Does not start PX.5.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const STUDIO = "https://studio.homecheff.eu/studio/photo-video";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a4-chrome-profile");
const OUT = join(ROOT, "docs/audits/px4a5-human-cert");
const FIX = join(OUT, "fixtures");
const MEDIA = join(OUT, "media");
const SHOT = join(OUT, "shots");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;
const CHARGE_RE = /chargeCredits|estimateCredits|instant-premium|VIDEO_WORKER/i;

function photos(): string[] {
  return ["a", "b", "c", "d"].map((id) => join(FIX, `photo-${id}.png`));
}

function ffprobe(file: string): Record<string, unknown> {
  return JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration,size,format_name:stream=codec_name,codec_type,width,height,profile,level,sample_rate,bit_rate,avg_frame_rate", "-of", "json", file],
      { encoding: "utf8" },
    ),
  ) as Record<string, unknown>;
}

function looksLikeMp4(file: string): { bytes: number; ftyp: boolean } {
  const buf = readFileSync(file);
  return { bytes: buf.byteLength, ftyp: buf.subarray(0, 32).toString("latin1").includes("ftyp") };
}

async function configure(page: Page, seconds: number, music: boolean): Promise<void> {
  if (await page.locator('[data-testid="px4a-resume-fresh"]').count()) {
    await page.locator('[data-testid="px4a-resume-fresh"]').click();
    await page.waitForTimeout(400);
  }
  await page.locator('[data-testid="px4a-file-input"]').setInputFiles(photos());
  await page.waitForTimeout(900);
  const ratio = page.locator('[data-testid="px4a-ratio"] button[aria-label*="9:16"], [data-testid="px4a-ratio"] button').first();
  const nineSixteen = page.locator('[data-testid="px4a-ratio"] button').filter({ hasText: /9:16|Verticaal|Portrait/i });
  if (await nineSixteen.count()) await nineSixteen.first().click();
  void ratio;
  const dur = page.locator(`[data-testid="px4a-video-duration"] button[aria-label="${seconds} sec"]`);
  if (await dur.count()) await dur.click();
  const autoMove = page.locator('[data-testid="px4a-movement"] button').filter({ hasText: /Automatisch|Auto/ });
  if (await autoMove.count()) await autoMove.first().click();
  const smooth = page.locator('[data-testid="px4a-style"] button').filter({ hasText: /Soepel|Smooth/ });
  if (await smooth.count()) await smooth.first().click();
  await page.locator('[data-testid="px4a-photo-0"] button').first().click();
  await page.locator('[data-testid="px4a-add-text"]').click();
  await page.locator('[data-testid="px4a-text-input"]').fill(`${seconds}S TITLE`);
  const modern = page.locator('[data-testid="px4a-text-font"] button').filter({ hasText: /Modern/i });
  if (await modern.count()) await modern.first().click();
  await page.locator('[data-testid="px4a-photo-1"] button').first().click();
  await page.locator('[data-testid="px4a-add-text"]').click();
  await page.locator('[data-testid="px4a-text-input"]').fill(`${seconds}S EXTRA`);
  if (music) {
    await page.locator('[data-testid="px4a-audio-own"]').click();
    await page.locator('[data-testid="px4a-audio-file"]').setInputFiles(join(FIX, "music.wav"));
    await page.waitForTimeout(800);
    const win = page.locator('[data-testid="px4a-audio-window"]');
    if (await win.count()) {
      const box = await win.boundingBox();
      if (box) await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
    }
  } else {
    await page.locator('[data-testid="px4a-audio-none"]').click();
  }
}

async function main(): Promise<void> {
  mkdirSync(MEDIA, { recursive: true });
  mkdirSync(join(MEDIA, "frames"), { recursive: true });
  mkdirSync(SHOT, { recursive: true });
  const hits: { provider: string[]; credit: string[]; charge: string[] } = { provider: [], credit: [], charge: [] };
  const results: Record<string, unknown>[] = [];

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: "nl-NL",
    acceptDownloads: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  page.on("request", (req) => {
    const url = req.url();
    if (PROVIDER_RE.test(url)) hits.provider.push(url);
    if (CREDIT_RE.test(url) && !hits.credit.includes(`${req.method()} ${new URL(url).host}`)) {
      hits.credit.push(`${req.method()} ${new URL(url).host}`);
    }
    if (CHARGE_RE.test(url)) hits.charge.push(url);
  });

  try {
    for (const seconds of [45, 60] as const) {
      console.log(`=== Chrome standalone ${seconds}s ===`);
      await page.goto(STUDIO, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForSelector('[data-testid="px4a-composer"]', { timeout: 60_000 });
      await configure(page, seconds, true);
      await page.screenshot({ path: join(SHOT, `chrome-${seconds}-ready.png`) }).catch(() => undefined);
      if (await page.locator('[data-testid="px4a-auth-gate"]').count()) {
        results.push({ seconds, status: "FAIL", reason: "auth gate" });
        continue;
      }
      const started = Date.now();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 240_000 }),
        page.locator('[data-testid="px4a-export-download"]').click(),
      ]);
      const dest = join(MEDIA, `chrome-studio-${seconds}.mp4`);
      await download.saveAs(dest);
      const wallMs = Date.now() - started;
      const head = looksLikeMp4(dest);
      const probe = ffprobe(dest);
      const format = (probe.format ?? {}) as { duration?: string; size?: string };
      const streams = (probe.streams ?? []) as { codec_type?: string; codec_name?: string; width?: number; height?: number; profile?: string }[];
      const video = streams.find((s) => s.codec_type === "video");
      const audio = streams.find((s) => s.codec_type === "audio");
      const duration = format.duration ? Number(format.duration) : null;
      const ok =
        head.ftyp &&
        head.bytes > 20_000 &&
        duration != null &&
        Math.abs(duration - seconds) < 1.5 &&
        Boolean(video?.codec_name?.match(/h264|avc/i)) &&
        Boolean(audio?.codec_name?.match(/aac/i));
      const row = {
        seconds,
        status: ok ? "PASS" : "FAIL",
        wallMs,
        bytes: head.bytes,
        mb: Number((head.bytes / (1024 * 1024)).toFixed(2)),
        ftyp: head.ftyp,
        duration,
        drift: duration != null ? Number((duration - seconds).toFixed(3)) : null,
        width: video?.width ?? null,
        height: video?.height ?? null,
        videoCodec: video?.codec_name ?? null,
        profile: video?.profile ?? null,
        audioCodec: audio?.codec_name ?? null,
        file: dest,
      };
      results.push(row);
      console.log(JSON.stringify(row, null, 2));
      if (ok) {
        execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "2", "-i", dest, "-frames:v", "1", join(MEDIA, `frames/chrome-${seconds}-early.jpg`)]);
        execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(seconds / 2), "-i", dest, "-frames:v", "1", join(MEDIA, `frames/chrome-${seconds}-mid.jpg`)]);
        execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(seconds - 1.5), "-i", dest, "-frames:v", "1", join(MEDIA, `frames/chrome-${seconds}-late.jpg`)]);
      }
    }
  } finally {
    await context.close().catch(() => undefined);
  }

  const report = { at: new Date().toISOString(), browser: "Chrome desktop", hits, results };
  writeFileSync(join(OUT, "chrome-long-export.json"), JSON.stringify(report, null, 2));
  console.log("Wrote", join(OUT, "chrome-long-export.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
