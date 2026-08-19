#!/usr/bin/env npx tsx
/**
 * PX.4A.7 authenticated Production certification — untracked helper.
 * Requires logged-in `.px4a7-prod-profile` persistent Chrome context.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, type BrowserContext, type Page } from "playwright";

const HC = "https://homecheff.eu";
const STUDIO = "https://studio.homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a7-prod-profile");
const OUT = join(ROOT, "docs/audits/px4a7-prod-cert");
const FIX = join(OUT, "fixtures");
const SHOTS = join(OUT, "shots");
const FRAMES = join(OUT, "frames");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|api\.openai|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
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

function shaFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
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

async function digitCount(page: Page): Promise<number> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="px4a-photo-"]')].filter((el) =>
      /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || "")
    ).length
  );
}

async function waitDigits(page: Page, n: number): Promise<void> {
  await waitUntil(`strip=${n}`, async () => (await digitCount(page)) === n, 120_000);
}

async function openStudio(page: Page, fresh = true): Promise<void> {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 30_000 });
  if (fresh && (await page.getByTestId("px4a-resume-fresh").count())) {
    await page.getByTestId("px4a-resume-fresh").click();
    await page.waitForTimeout(800);
  }
}

async function addPhoto(page: Page, file: string): Promise<void> {
  await page.setInputFiles('[data-testid="px4a-file-input"]', file);
  await page.waitForTimeout(2500);
}

async function addVideo(page: Page, file: string): Promise<void> {
  await page.setInputFiles('[data-testid="px4a-video-input"]', file);
  await page.waitForTimeout(4500);
}

async function selectClip(page: Page, idx: number): Promise<void> {
  await page.getByTestId(`px4a-photo-${idx}`).locator("button").first().click();
  await page.waitForTimeout(500);
}

async function videoIndices(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const out: number[] = [];
    for (const el of document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')) {
      const m = (el.getAttribute("data-testid") || "").match(/px4a-video-thumb-(\d+)/);
      if (m) out.push(Number(m[1]));
    }
    return [...new Set(out)].sort((a, b) => a - b);
  });
}

async function setDuration(page: Page, seconds: number): Promise<void> {
  const btn = page.locator(`[data-testid="px4a-video-duration"] button[aria-label="${seconds} sec"]`);
  if (await btn.count()) {
    await btn.click();
    return;
  }
  const chips = page.locator('[data-testid="px4a-video-duration"] button');
  const n = await chips.count();
  for (let i = 0; i < n; i++) {
    const text = (await chips.nth(i).innerText()).trim();
    if (text.includes(String(seconds))) {
      await chips.nth(i).click();
      return;
    }
  }
}

async function exportDownload(page: Page, dest: string): Promise<{ wallMs: number }> {
  const started = Date.now();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 300_000 }),
    page.getByTestId("px4a-export-download").click(),
  ]);
  await download.saveAs(dest);
  return { wallMs: Date.now() - started };
}

function inspectMp4(path: string, sampleTimes: number[]): Report {
  const buf = readFileSync(path);
  const ftyp = buf.subarray(0, 32).toString("latin1").includes("ftyp");
  const probe = JSON.parse(
    ff(["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height", "-of", "json", path])
  ) as {
    format?: { duration?: string; size?: string };
    streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number }[];
  };
  const video = probe.streams?.find((s) => s.codec_type === "video");
  const audio = probe.streams?.find((s) => s.codec_type === "audio");
  mkdirSync(FRAMES, { recursive: true });
  const frames: Report[] = [];
  for (const t of sampleTimes) {
    const out = join(FRAMES, `t-${String(t).replace(".", "_")}-${randomBytes(3).toString("hex")}.png`);
    ffmpeg(["-ss", String(t), "-i", path, "-frames:v", "1", out]);
    const h = frameHash(out);
    frames.push({ t, ...h, path: out });
  }
  const movingPairs: Report[] = [];
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i] as { hash: string; t: number };
    const b = frames[i + 1] as { hash: string; t: number };
    if (Math.abs(b.t - a.t) >= 0.3) movingPairs.push({ a: a.t, b: b.t, differ: a.hash !== b.hash });
  }
  return {
    bytes: buf.byteLength,
    ftyp,
    duration: probe.format?.duration ? Number(probe.format.duration) : null,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    frames,
    movingPairs,
    framesDiffer: movingPairs.some((p) => (p as { differ: boolean }).differ),
  };
}

async function buildMixedComposition(page: Page): Promise<{ videoIdxs: number[] }> {
  const photos = ["red", "green", "blue", "orange", "purple"].map((c) => join(FIX, `px4a7-photo-${c}.png`));
  const v10 = join(FIX, "px4a7-video-10s.mp4");
  const v5 = join(FIX, "px4a7-video-5s.mp4");

  await addPhoto(page, photos[0]!);
  await waitDigits(page, 1);
  await addPhoto(page, photos[1]!);
  await waitDigits(page, 2);
  await addVideo(page, v10);
  await waitDigits(page, 3);
  await addPhoto(page, photos[2]!);
  await waitDigits(page, 4);
  await addVideo(page, v5);
  await waitDigits(page, 5);
  await addPhoto(page, photos[3]!);
  await waitDigits(page, 6);
  await addPhoto(page, photos[4]!);
  await waitDigits(page, 7);

  const vids = await videoIndices(page);
  if (vids.length < 2) throw new Error("expected 2 video clips");

  await setDuration(page, 30);
  await page.getByTestId("px4a-transition-fade").click();

  // trim first video ~5s via end handle drag
  await selectClip(page, vids[0]!);
  const track = page.getByTestId("px4a-video-trim-track");
  const box = await track.boundingBox();
  if (box) {
    const endX = box.x + box.width * 0.45;
    const y = box.y + box.height / 2;
    await page.mouse.move(endX, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  }

  await selectClip(page, vids[0]!);
  await page.getByTestId("px4a-video-audio-on").click();
  await selectClip(page, vids[1]!);
  await page.getByTestId("px4a-video-audio-off").click();

  await selectClip(page, vids[0]!);
  await page.getByTestId("px4a-add-text").click();
  await page.getByTestId("px4a-text-input").fill("MIXED VIDEO TEST");

  await selectClip(page, 0);
  const photoInspector = {
    movement: await page.getByTestId("px4a-movement-photo").count(),
    trim: await page.getByTestId("px4a-video-trim").count(),
  };
  await selectClip(page, vids[0]!);
  const videoInspector = {
    movement: await page.getByTestId("px4a-movement-photo").count(),
    trim: await page.getByTestId("px4a-video-trim").count(),
    audio: await page.getByTestId("px4a-video-audio-on").count(),
  };

  return { videoIdxs: vids, photoInspector, videoInspector } as unknown as { videoIdxs: number[] };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    startedAt: new Date().toISOString(),
    mergeSha: "3be9654b6ddc7b024cdaffda35e6daaa3dd07445",
    deploymentId: "5980026965",
  };

  if (!existsSync(PROFILE)) throw new Error("missing .px4a7-prod-profile — log in first");

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: "nl-NL",
    acceptDownloads: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  attachNetwork(page);

  try {
    const me = await context.request.get(`${HC}/api/user/me`, { failOnStatusCode: false });
    report.auth = { meStatus: me.status() };
    if (me.status() !== 200) throw new Error("not authenticated in .px4a7-prod-profile");

    await openStudio(page, true);
    report.canvasCount = await page.locator("[data-testid='px4a-composer'] canvas").count();
    report.addTiles = {
      photo: await page.getByTestId("px4a-add-photo-tile").count(),
      video: await page.getByTestId("px4a-add-video-tile").count(),
    };

    const mixed = await buildMixedComposition(page);
    report.mixed = mixed;
    await shot(page, "mixed-ready");

    await waitUntil("export enabled", async () => {
      const btn = page.getByTestId("px4a-export-download");
      return (await btn.count()) > 0 && !(await btn.isDisabled());
    }, 120_000);

    const mp4 = join(OUT, "standalone-mixed.mp4");
    const exp = await exportDownload(page, mp4);
    report.standaloneExport = { ...exp, path: mp4, ...inspectMp4(mp4, [0.5, 4, 8, 12, 20, 25, 28]) };

    // signature transition export quick check
    await page.getByTestId("px4a-transition-hc_shards").click();
    const mp4Sig = join(OUT, "standalone-shards.mp4");
    const exp2 = await exportDownload(page, mp4Sig);
    report.signatureExport = { ...exp2, path: mp4Sig, ...inspectMp4(mp4Sig, [2, 6, 10]) };

    // refresh/resume
    const beforeRefresh = await page.evaluate(() => ({
      digits: [...document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')].length,
      text: (document.querySelector('[data-testid="px4a-text-input"]') as HTMLInputElement | null)?.value ?? null,
    }));
    await page.reload({ waitUntil: "domcontentloaded" });
    if (await page.getByTestId("px4a-resume-continue").count()) {
      await page.getByTestId("px4a-resume-continue").click();
      await page.waitForTimeout(2000);
    }
    const afterRefresh = await page.evaluate(() => ({
      digits: [...document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')].length,
      strip: [...document.querySelectorAll('[data-testid^="px4a-photo-"]')].filter((el) =>
        /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || "")
      ).length,
    }));
    report.refresh = { beforeRefresh, afterRefresh, restored: afterRefresh.strip >= 7 && afterRefresh.digits >= 2 };

    // remove one video clip
    const vids = await videoIndices(page);
    if (vids[1] != null) {
      await selectClip(page, vids[1]);
      await page.getByRole("button", { name: /Verwijderen|Remove/i }).click().catch(async () => {
        const rm = page.locator('[data-testid^="px4a-photo-"]').getByRole("button", { name: /Verwijderen|Remove/i });
        if (await rm.count()) await rm.first().click();
      });
      await page.waitForTimeout(1200);
    }
    report.afterRemoveCount = await digitCount(page);

    // 390px smoke
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    report.mobile390 = {
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      addPhoto: await page.getByTestId("px4a-add-photo-tile").isVisible(),
      addVideo: await page.getByTestId("px4a-add-video-tile").isVisible(),
      canvas: await page.locator("[data-testid='px4a-composer'] canvas").count(),
    };
    await shot(page, "390");

    // HomeCheff attach with mixed media
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1200);
    if (await page.getByRole("button", { name: "Ik bied iets aan" }).count()) {
      await page.getByRole("button", { name: "Ik bied iets aan" }).click();
      await page.waitForTimeout(400);
    }
    if (await page.getByRole("button", { name: "Tuin & Natuur" }).count()) {
      await page.getByRole("button", { name: "Tuin & Natuur" }).click();
    }
    if (await page.getByText("Kies een groep").count()) {
      await page.locator("section button").filter({ hasNotText: "Terug" }).nth(0).click();
    }
    if (await page.getByText("Wat past hier het beste?").count()) {
      await page.locator("section button").filter({ hasNotText: /Terug|groep/ }).nth(0).click();
      const next = page.getByRole("button", { name: /Verder/ });
      if (await next.count()) await next.first().click();
    }
    if (await page.getByRole("button", { name: "Verder" }).count()) {
      await page.getByRole("button", { name: "Verder" }).last().click();
    }

    await waitUntil("listing CTA", async () => (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0, 60_000);
    const title = `PX.4A.7 mixed — niet publiceren ${Date.now()}`;
    const titleBox = page.getByLabel("Titel", { exact: true });
    if (await titleBox.count()) await titleBox.fill(title);
    else await page.locator("input[required]").first().fill(title);
    const desc = page.getByLabel(/Omschrijving|Vertel wat je aanbiedt/);
    if (await desc.count()) await desc.first().fill("PX.4A.7 disposable. Do not publish.");
    const price = page.locator('input[inputmode="decimal"]').first();
    if (await price.count()) await price.fill("4.50");

    const listingPhotos = ["red", "green", "blue", "orange"].map((c) => join(FIX, `px4a7-photo-${c}.png`));
    await page.locator('input[type="file"][accept*="image/jpeg"]').first().setInputFiles(listingPhotos);
    await waitUntil("4 listing photos", async () => {
      const uploading = await page.getByText("Uploaden...").count();
      const uploaded = await page.getByText(/Geüploade foto's \(4\)|4\/\d+ foto/).count();
      return uploading === 0 && uploaded > 0;
    }, 120_000);

    await page.locator('[data-testid="px4a-make-free-video"]').click();
    await waitUntil("from-item composer", async () => page.url().includes("/studio/photo-video") && (await page.getByTestId("px4a-composer").count()) > 0, 90_000);
    if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();

    await addVideo(page, join(FIX, "px4a7-video-5s.mp4"));
    await waitDigits(page, Math.max(5, await digitCount(page)));
    await setDuration(page, 15);
    await page.getByTestId("px4a-transition-fade").click();
    const hcVids = await videoIndices(page);
    if (hcVids[0] != null) {
      await selectClip(page, hcVids[0]);
      await page.getByTestId("px4a-add-text").click();
      await page.getByTestId("px4a-text-input").fill("HC MIXED");
    }

    const attachStarted = Date.now();
    await page.getByTestId("px4a-item-finish").click();
    await waitUntil("listing return", async () => page.url().includes("/sell/new") && !page.url().includes("studio.homecheff"), 240_000);
    await waitUntil("listing video", async () => {
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
      titlePreserved: draft.title.includes("PX.4A.7 mixed"),
      photosKept: draft.photoCount >= 4,
      oneVideo: draft.videoCount <= 1,
      unpublished: page.url().includes("/sell/new"),
    };

    const attached = join(OUT, "homecheff-attached.mp4");
    const res = await fetch(draft.videoUrl);
    if (!res.ok) throw new Error(`listing video download ${res.status}`);
    writeFileSync(attached, Buffer.from(await res.arrayBuffer()));
    report.homecheffMp4 = inspectMp4(attached, [1, 4, 8, 12]);

    report.network = network;
    const blockers: string[] = [];
    const standalone = report.standaloneExport as { ftyp?: boolean; videoCodec?: string; framesDiffer?: boolean; duration?: number };
    if (!standalone.ftyp) blockers.push("standalone ftyp missing");
    if (standalone.videoCodec !== "h264") blockers.push(`standalone codec ${standalone.videoCodec}`);
    if (!standalone.framesDiffer) blockers.push("standalone moving-frame proof failed");
    if (!(report.refresh as { restored?: boolean }).restored) blockers.push("refresh/resume incomplete");
    if (!(report.homecheff as { oneVideo?: boolean }).oneVideo) blockers.push("one-video law failed");
    if (network.providerHits.length) blockers.push("provider hits");
    if (network.creditHits.length) blockers.push("credit hits");
    report.blockers = blockers;
    report.status = blockers.length ? "INCOMPLETE" : "PASS";
  } catch (err) {
    report.status = "FAIL";
    report.error = err instanceof Error ? err.message : String(err);
    await shot(page, "fail");
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "cert.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close();
  }
  if (report.status !== "PASS") process.exit(1);
}

void main();
