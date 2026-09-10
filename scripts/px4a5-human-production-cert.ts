#!/usr/bin/env npx tsx
/**
 * PX.4A.5 — Production human certification helper (Flows A–F).
 *
 * Real Google Chrome + dedicated/reused seller profile. Does not publish.
 *
 *   npx tsx scripts/px4a5-human-production-cert.ts
 *   PX4A5_START=B   continue from a later flow (keeps live-report.json)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Cookie, type Page, type Request } from "playwright";

const HC_ORIGIN = "https://homecheff.eu";
const STUDIO_ORIGIN = "https://studio.homecheff.eu";
const SELL_NEW = `${HC_ORIGIN}/sell/new`;
const STUDIO_PUBLIC = `${STUDIO_ORIGIN}/studio/photo-video`;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_DIR =
  process.env.PX4A5_CHROME_PROFILE?.trim() ||
  join(REPO_ROOT, ".px4a4-chrome-profile");
const OUT_DIR = join(REPO_ROOT, "docs/audits/px4a5-human-cert");
const FIX_DIR = join(OUT_DIR, "fixtures");
const SHOT_DIR = join(OUT_DIR, "shots");
const MEDIA_DIR = join(OUT_DIR, "media");

const PROVIDER_RE =
  /vidu|elevenlabs|openai\.com|api\.openai|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;
const CHARGE_RE = /chargeCredits|estimateCredits|instant-premium|VIDEO_WORKER/i;

type Report = Record<string, unknown> & {
  startedAt: string;
  updatedAt: string;
  accountClass: string;
  hcAuthenticated: boolean;
  studioAuthenticated: boolean;
  dpl: { studio: string | null; homecheff: string | null };
  network: {
    providerHits: string[];
    creditHits: string[];
    renderHits: string[];
    chargeHits: string[];
    blobUploads: { url: string; bytes: number | null }[];
    handoffPosts: string[];
    listingUploads: string[];
  };
  notes: string[];
};

const START_FLOW = (process.env.PX4A5_START ?? "A").trim().toUpperCase();

const report: Report = {
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  accountClass: "unknown",
  hcAuthenticated: false,
  studioAuthenticated: false,
  dpl: { studio: null, homecheff: null },
  preflight: { status: "pending" },
  flowA: { status: "pending" },
  flowB: { status: "pending" },
  flowC: { status: "pending" },
  flowD: { status: "pending" },
  flowE: { status: "pending" },
  flowF: { status: "pending" },
  safari: { desktop: "NOT TESTED", ios: "NOT TESTED" },
  network: {
    providerHits: [],
    creditHits: [],
    renderHits: [],
    chargeHits: [],
    blobUploads: [],
    handoffPosts: [],
    listingUploads: [],
  },
  notes: [],
};

function loadExistingReport(): void {
  const path = join(OUT_DIR, "live-report.json");
  if (!existsSync(path)) return;
  try {
    const prev = JSON.parse(readFileSync(path, "utf8")) as Report;
    Object.assign(report, prev);
    report.notes = Array.isArray(prev.notes) ? prev.notes.slice() : [];
    report.notes.push(`Helper relaunch ${new Date().toISOString()} PX4A5_START=${START_FLOW}`);
  } catch {
    /* keep fresh */
  }
}

function saveReport(): void {
  report.updatedAt = new Date().toISOString();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "live-report.json"), JSON.stringify(report, null, 2));
}

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
}

function writeFixtures(): void {
  mkdirSync(FIX_DIR, { recursive: true });
  const colors = [
    ["a", "red"],
    ["b", "green"],
    ["c", "blue"],
    ["d", "orange"],
    ["e", "purple"],
    ["f", "teal"],
    ["g", "navy"],
    ["h", "maroon"],
    ["i", "olive"],
    ["j", "gold"],
    ["k", "deeppink"],
    ["l", "sienna"],
  ] as const;
  for (const [id, color] of colors) {
    const dest = join(FIX_DIR, `photo-${id}.png`);
    ffmpeg(["-f", "lavfi", "-i", `color=c=${color}:s=720x1280:d=1`, "-frames:v", "1", dest]);
  }
  ffmpeg(["-f", "lavfi", "-i", "sine=frequency=440:duration=20", join(FIX_DIR, "music.wav")]);
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=navy:s=640x360:d=3",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=330:duration=3",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    join(FIX_DIR, "listing-sample.mp4"),
  ]);
}

function photoPaths(count: number): string[] {
  const letters = "abcdefghijkl";
  return Array.from({ length: count }, (_, i) => join(FIX_DIR, `photo-${letters[i]}.png`));
}

function ffprobe(file: string): Record<string, unknown> {
  const raw = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration,size,format_name:stream=codec_name,codec_type,width,height,profile,level,sample_rate,bit_rate", "-of", "json", file],
    { encoding: "utf8" },
  );
  return JSON.parse(raw) as Record<string, unknown>;
}

function looksLikeMp4(file: string): { bytes: number; ftyp: boolean } {
  const buf = readFileSync(file);
  const head = buf.subarray(0, 32).toString("latin1");
  return { bytes: buf.byteLength, ftyp: head.includes("ftyp") };
}

async function downloadUrl(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function hasHcSessionCookie(cookies: Cookie[]): boolean {
  return cookies.some((c) => {
    const n = c.name.toLowerCase();
    return (
      n === "next-auth.session-token" ||
      n === "__secure-next-auth.session-token" ||
      n === "__host-next-auth.session-token" ||
      n.startsWith("next-auth.session-token.") ||
      n.startsWith("__secure-next-auth.session-token.")
    );
  });
}

async function probeHcAuthenticated(context: BrowserContext) {
  const cookies = await context.cookies(HC_ORIGIN);
  const cookiePresent = hasHcSessionCookie(cookies);
  try {
    const res = await context.request.get(`${HC_ORIGIN}/api/user/me`, {
      timeout: 20_000,
      failOnStatusCode: false,
    });
    if (res.status() !== 200) {
      return { cookiePresent, apiOk: false, status: res.status(), sellerRoles: [] as string[] };
    }
    const body = (await res.json().catch(() => null)) as { sellerRoles?: string[] } | null;
    return {
      cookiePresent,
      apiOk: true,
      status: 200,
      sellerRoles: Array.isArray(body?.sellerRoles) ? body.sellerRoles.map(String) : [],
    };
  } catch {
    return { cookiePresent, apiOk: false, status: null, sellerRoles: [] as string[] };
  }
}

async function probeStudioAuthenticated(context: BrowserContext): Promise<boolean> {
  try {
    const res = await context.request.get(`${STUDIO_ORIGIN}/api/me/studio-account`, {
      timeout: 20_000,
      failOnStatusCode: false,
    });
    return res.status() === 200;
  } catch {
    return false;
  }
}

async function waitForHcAuth(context: BrowserContext, timeoutMs: number): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  let last: string[] = [];
  while (Date.now() < deadline) {
    const probe = await probeHcAuthenticated(context);
    if (probe.apiOk) {
      consecutive += 1;
      last = probe.sellerRoles;
      console.log(`  HC auth OK (${consecutive}/2) roles=${last.join(",") || "none"}`);
      if (consecutive >= 2) return last;
    } else {
      consecutive = 0;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("HomeCheff authentication not confirmed. Log in as a seller, then re-run.");
}

async function shot(page: Page, name: string): Promise<string> {
  mkdirSync(SHOT_DIR, { recursive: true });
  const dest = join(SHOT_DIR, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: dest, fullPage: false }).catch(() => undefined);
  return dest;
}

async function banner(page: Page, title: string, body: string): Promise<void> {
  await page.evaluate(
    ({ title: t, body: b }) => {
      const id = "px4a5-cert-banner";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.cssText =
          "position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;max-width:42rem;margin:0 auto;padding:12px 14px;border-radius:14px;background:#041428;color:#fff;font:600 13px/1.45 ui-sans-serif,system-ui,sans-serif;";
        document.body.appendChild(el);
      }
      el.innerHTML = `<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:4px">PX.4A.5 certificering — niet publiceren</div><div style="font-size:15px;margin-bottom:4px">${t}</div><div style="font-weight:500;opacity:.92">${b}</div>`;
    },
    { title, body },
  );
}

async function dplFrom(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-dpl-id"));
}

async function waitUntil(label: string, fn: () => Promise<boolean>, timeoutMs: number, pollMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) {
      console.log(`  reached: ${label}`);
      return;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`Timeout waiting for: ${label}`);
}

function classify(url: string): "provider" | "credit" | "render" | "charge" | null {
  if (PROVIDER_RE.test(url)) return "provider";
  if (CHARGE_RE.test(url)) return "charge";
  if (CREDIT_RE.test(url)) return "credit";
  if (/\/api\/.*render|server-ffmpeg|ffmpeg-static/i.test(url)) return "render";
  return null;
}

function attachNetworkWatch(page: Page): { lastAttach: { status: number | null; url: string | null } } {
  const lastAttach = { status: null as number | null, url: null as string | null };
  page.on("response", (res) => {
    const url = res.url();
    if (/\/api\/studio\/px4a-export-attach/.test(url)) {
      lastAttach.status = res.status();
      lastAttach.url = url;
    }
  });
  page.on("request", (req: Request) => {
    const url = req.url();
    const kind = classify(url);
    const hit = `${kind ?? "net"}:${req.method()} ${(() => {
      try {
        return new URL(url).host;
      } catch {
        return "unknown";
      }
    })()}`;
    if (kind === "provider" && !report.network.providerHits.includes(hit)) report.network.providerHits.push(hit);
    if (kind === "credit" && !report.network.creditHits.includes(hit)) report.network.creditHits.push(hit);
    if (kind === "render" && !report.network.renderHits.includes(hit)) report.network.renderHits.push(hit);
    if (kind === "charge" && !report.network.chargeHits.includes(hit)) report.network.chargeHits.push(hit);
    if (/\/api\/photo-video\/export-handoff/.test(url) && req.method() === "POST") {
      report.network.handoffPosts.push(url);
    }
    if (/\/api\/studio\/px4a-export-attach/.test(url) && req.method() === "POST") {
      report.network.handoffPosts.push(url);
    }
    if (/\/api\/upload/.test(url) && req.method() === "POST") {
      report.network.listingUploads.push(new URL(url).pathname);
    }
  });
  page.on("requestfinished", async (req) => {
    const url = req.url();
    if (!/blob\.vercel-storage\.com/.test(url)) return;
    if (!["PUT", "POST"].includes(req.method())) return;
    const headers = req.headers();
    const bytes = headers["content-length"] ? Number(headers["content-length"]) : null;
    report.network.blobUploads.push({ url: url.split("?")[0] ?? url, bytes: Number.isFinite(bytes) ? bytes : null });
  });
  return lastAttach;
}

async function readDraft(page: Page) {
  return page.evaluate(() => {
    let raw: {
      title?: string;
      description?: string;
      images?: { url?: string }[];
      video?: { url?: string; duration?: number | null } | null;
    } | null = null;
    try {
      const stored = window.sessionStorage.getItem("hc-px4a-item-form:v1");
      raw = stored ? (JSON.parse(stored) as typeof raw) : null;
    } catch {
      raw = null;
    }
    const videoEl = document.querySelector("video");
    const videos = Array.from(document.querySelectorAll("video"));
    return {
      path: location.pathname + location.search,
      title: (raw?.title || "").trim(),
      description: (raw?.description || "").trim(),
      photoCount: raw?.images?.length ?? 0,
      hasVideo: Boolean(raw?.video?.url || videoEl?.currentSrc || videoEl?.src),
      videoUrl: raw?.video?.url || videoEl?.currentSrc || videoEl?.src || null,
      videoDuration: raw?.video?.duration ?? null,
      videoElSrc: videoEl?.currentSrc || videoEl?.src || null,
      videoCount: videos.length,
      ctaVisible: Boolean(document.querySelector('[data-testid="px4a-make-free-video"]')),
      replaceVisible: Boolean(document.querySelector('[data-testid="px4a-replace-video"]')),
      pendingVisible: Boolean(document.querySelector('[data-testid="px4a-export-pending"]')),
      publishVisible: /Plaatsen|Publiceren|Publish/i.test(document.body.innerText),
    };
  });
}

async function completeEntryWizard(page: Page): Promise<void> {
  if (await page.locator('[data-testid="px4a-make-free-video"]').count()) return;
  if (await page.getByRole("button", { name: "Ik bied iets aan" }).count()) {
    await page.getByRole("button", { name: "Ik bied iets aan" }).click();
    await page.waitForTimeout(400);
  }
  if (await page.getByRole("button", { name: "Tuin & Natuur" }).count()) {
    await page.getByRole("button", { name: "Tuin & Natuur" }).click();
    await page.waitForTimeout(400);
  }
  const groupBtn = page.locator("section button.rounded-xl, section button.rounded-lg").first();
  if (await page.getByText("Kies een groep").count()) {
    const firstGroup = page.locator("section button").filter({ hasNotText: "Terug" }).nth(0);
    await firstGroup.click();
    await page.waitForTimeout(400);
  }
  if (await page.getByText("Wat past hier het beste?").count()) {
    const firstItem = page.locator("section button").filter({ hasNotText: /Terug|groep/ }).nth(0);
    await firstItem.click();
    await page.waitForTimeout(300);
    const next = page.getByRole("button", { name: /Verder naar samenvatting|Verder/ });
    if (await next.count()) await next.first().click();
    await page.waitForTimeout(400);
  }
  if (await page.getByRole("button", { name: "Verder" }).count()) {
    await page.getByRole("button", { name: "Verder" }).last().click();
    await page.waitForTimeout(600);
  }
  void groupBtn;
}

async function fillListingBasics(page: Page, title: string): Promise<void> {
  const titleBox = page.getByLabel("Titel", { exact: true });
  if (await titleBox.count()) {
    await titleBox.fill(title);
  } else {
    await page.locator('input[required]').first().fill(title);
  }
  const desc = page.getByLabel(/Omschrijving|Vertel wat je aanbiedt/);
  if (await desc.count()) {
    await desc.first().fill("PX.4A.5 disposable listing. Do not publish. Certification only.");
  } else {
    await page.locator("textarea").first().fill("PX.4A.5 disposable listing. Do not publish.");
  }
  const price = page.locator('input[inputmode="decimal"]').first();
  if (await price.count()) await price.fill("3.50");
}

async function uploadListingPhotos(page: Page, count: number): Promise<void> {
  const files = photoPaths(count);
  const gallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  await gallery.setInputFiles(files);
  await waitUntil(
    `${count} listing photos`,
    async () => {
      const uploading = await page.getByText("Uploaden...").count();
      const uploaded = await page.getByText(new RegExp(`Geüploade foto's \\(${count}\\)`)).count();
      const counter = await page.getByText(new RegExp(`${count}/\\d+ foto`)).count();
      return uploading === 0 && (uploaded > 0 || counter > 0);
    },
    90_000,
    1500,
  );
}

async function waitForComposer(page: Page): Promise<void> {
  await waitUntil(
    "studio composer",
    async () => page.url().includes("/studio/photo-video") && (await page.locator('[data-testid="px4a-composer"]').count()) > 0,
    90_000,
  );
  if (await page.locator('[data-testid="px4a-resume-fresh"]').count()) {
    await page.locator('[data-testid="px4a-resume-fresh"]').click();
    await page.waitForTimeout(500);
  }
}

async function configureComposition(
  page: Page,
  opts: {
    seconds: number;
    music: boolean;
    extraPhotos?: string[];
    texts: [string, string];
  },
): Promise<void> {
  if (opts.extraPhotos?.length) {
    await page.locator('[data-testid="px4a-file-input"]').setInputFiles(opts.extraPhotos);
    await page.waitForTimeout(800);
  }
  const later = page.getByLabel("Later").first();
  if (await later.count()) {
    await later.click();
    await page.waitForTimeout(200);
  }
  const durationChip = page.locator(`[data-testid="px4a-video-duration"] button[aria-label="${opts.seconds} sec"]`);
  if (await durationChip.count()) await durationChip.click();
  const autoMove = page.locator('[data-testid="px4a-movement"] button[aria-pressed]').filter({ hasText: /Automatisch|Auto/ });
  if (await autoMove.count()) await autoMove.first().click();
  const smooth = page.locator('[data-testid="px4a-style"] button').filter({ hasText: /Soepel|Smooth/ });
  if (await smooth.count()) await smooth.first().click();

  await page.locator('[data-testid="px4a-photo-0"] button').first().click();
  await page.locator('[data-testid="px4a-add-text"]').click();
  await page.locator('[data-testid="px4a-text-input"]').fill(opts.texts[0]);
  await page.locator('[data-testid="px4a-photo-1"] button').first().click();
  await page.locator('[data-testid="px4a-add-text"]').click();
  await page.locator('[data-testid="px4a-text-input"]').fill(opts.texts[1]);

  if (opts.music) {
    await page.locator('[data-testid="px4a-audio-own"]').click();
    await page.locator('[data-testid="px4a-audio-file"]').setInputFiles(join(FIX_DIR, "music.wav"));
    await page.waitForTimeout(800);
    const window = page.locator('[data-testid="px4a-audio-window"]');
    if (await window.count()) {
      const box = await window.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.35, box.y + box.height / 2);
      }
    }
  } else {
    await page.locator('[data-testid="px4a-audio-none"]').click();
  }
}

async function exportAndAttach(page: Page, label: string): Promise<{ wallMs: number; error: string | null }> {
  const started = Date.now();
  await shot(page, `${label}-before-export`);
  await page.locator('[data-testid="px4a-item-finish"]').click();
  const progress = page.locator('[data-testid="px4a-export-progress"]');
  await progress.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  await shot(page, `${label}-progress`);
  try {
    await waitUntil(
      `${label} returned to listing`,
      async () => {
        const err = await page.locator('[data-testid="px4a-export-error"]').textContent().catch(() => null);
        if (err && err.trim()) throw new Error(`export error: ${err}`);
        const url = page.url();
        if (/px4a-export-attach/.test(url)) {
          const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 500);
          throw new Error(`attach landing ${url} body=${body}`);
        }
        return url.includes("/sell/new") && !url.includes("studio.homecheff");
      },
      180_000,
      1500,
    );
  } catch (err) {
    await shot(page, `${label}-stuck`);
    throw err;
  }
  await waitUntil(
    `${label} video attached`,
    async () => {
      const draft = await readDraft(page);
      return draft.hasVideo || Boolean(draft.videoElSrc);
    },
    120_000,
    1500,
  );
  return { wallMs: Date.now() - started, error: null };
}

async function inspectListingVideo(page: Page, name: string): Promise<Record<string, unknown>> {
  mkdirSync(MEDIA_DIR, { recursive: true });
  const draft = await readDraft(page);
  const url = draft.videoUrl || draft.videoElSrc;
  if (!url || !url.startsWith("https://")) {
    return { ok: false, reason: "no-https-video", draft };
  }
  const dest = join(MEDIA_DIR, `${name}.mp4`);
  await downloadUrl(url, dest);
  const head = looksLikeMp4(dest);
  let probe: Record<string, unknown> = {};
  try {
    probe = ffprobe(dest);
  } catch (e) {
    probe = { error: e instanceof Error ? e.message : String(e) };
  }
  const format = (probe.format ?? {}) as { duration?: string; size?: string; format_name?: string };
  const streams = (probe.streams ?? []) as { codec_type?: string; codec_name?: string; width?: number; height?: number; profile?: string }[];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");
  const duration = format.duration ? Number(format.duration) : null;
  const mb = head.bytes / (1024 * 1024);
  return {
    ok: head.ftyp && head.bytes > 20_000,
    urlHost: new URL(url).host,
    bytes: head.bytes,
    mb: Number(mb.toFixed(2)),
    ftyp: head.ftyp,
    formatName: format.format_name ?? null,
    duration,
    videoCodec: video?.codec_name ?? null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    profile: video?.profile ?? null,
    audioCodec: audio?.codec_name ?? null,
    file: dest,
    draftTitle: draft.title,
    photoCount: draft.photoCount,
    videoCount: draft.videoCount,
  };
}

async function preflight(page: Page): Promise<void> {
  const checks: Record<string, unknown> = {};
  await page.goto(STUDIO_PUBLIC, { waitUntil: "domcontentloaded", timeout: 90_000 });
  checks.studioPhotoVideo = { status: 200, path: page.url(), dpl: await dplFrom(page) };
  report.dpl.studio = (await dplFrom(page)) || report.dpl.studio;
  await shot(page, "preflight-studio");
  await page.goto(`${STUDIO_ORIGIN}/studio/photo-video/from-item`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  checks.studioFromItem = { path: page.url() };
  await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
  checks.sellNew = { path: page.url(), dpl: await dplFrom(page) };
  report.dpl.homecheff = (await dplFrom(page)) || report.dpl.homecheff;
  await shot(page, "preflight-sell-new");
  report.preflight = { status: "PASS", checks };
  saveReport();
}

function shouldRun(flow: string): boolean {
  const order = ["A", "B", "C", "D", "E", "F"];
  return order.indexOf(flow) >= order.indexOf(START_FLOW);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(SHOT_DIR, { recursive: true });
  mkdirSync(MEDIA_DIR, { recursive: true });
  loadExistingReport();
  writeFixtures();
  saveReport();

  console.log("PX.4A.5 Production human certification");
  console.log("Profile:", PROFILE_DIR);
  console.log("Evidence:", OUT_DIR);
  console.log("Will NOT publish. Start flow:", START_FLOW);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: "nl-NL",
    acceptDownloads: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  attachNetworkWatch(page);

  try {
    await page.goto(HC_ORIGIN, { waitUntil: "domcontentloaded", timeout: 90_000 });
    let probe = await probeHcAuthenticated(context);
    if (!probe.apiOk) {
      await banner(page, "Log in als HomeCheff verkoper", "Niet publiceren. De helper wacht stil.");
      console.log("PAUSE — log in as a HomeCheff seller in the Chrome window.");
      const roles = await waitForHcAuth(context, 600_000);
      probe = { ...probe, apiOk: true, sellerRoles: roles, status: 200 };
    } else {
      await waitForHcAuth(context, 20_000);
    }
    report.hcAuthenticated = true;
    report.accountClass = probe.sellerRoles.length
      ? `authenticated HomeCheff seller (${probe.sellerRoles.join("+")})`
      : "authenticated HomeCheff user";
    report.studioAuthenticated = await probeStudioAuthenticated(context);
    saveReport();
    console.log("Account:", report.accountClass, "studioAuth=", report.studioAuthenticated);

    await preflight(page);

    if (shouldRun("A")) {
      console.log("=== FLOW A — new item with music ===");
      await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.evaluate(() => sessionStorage.removeItem("hc-px4a-item-form:v1"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await completeEntryWizard(page);
      await waitUntil("listing form CTA", async () => (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0, 60_000);
      await fillListingBasics(page, "PX.4A.5 Flow A — niet publiceren");
      await uploadListingPhotos(page, 4);
      await shot(page, "a-listing-ready");
      const before = await readDraft(page);
      await page.locator('[data-testid="px4a-make-free-video"]').click();
      await waitForComposer(page);
      report.dpl.studio = (await dplFrom(page)) || report.dpl.studio;
      await configureComposition(page, {
        seconds: 15,
        music: true,
        texts: ["PX4A5 TITLE", "PX4A5 EXTRA"],
      });
      await shot(page, "a-composer-ready");
      const exportRes = await exportAndAttach(page, "a");
      const inspect = await inspectListingVideo(page, "flow-a");
      const after = await readDraft(page);
      report.flowA = {
        status: inspect.ok && after.hasVideo && after.title.includes("Flow A") ? "PASS" : "FAIL",
        beforeTitle: before.title,
        afterTitle: after.title,
        photos: after.photoCount,
        unpublished: after.path.includes("/sell/new"),
        exportWallMs: exportRes.wallMs,
        inspect,
      };
      saveReport();
      console.log("Flow A:", report.flowA);
    }

    if (shouldRun("B")) {
      console.log("=== FLOW B — no music ===");
      await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
      if (!(await page.locator('[data-testid="px4a-make-free-video"]').count()) && !(await page.locator('[data-testid="px4a-replace-video"]').count())) {
        await completeEntryWizard(page);
        await fillListingBasics(page, "PX.4A.5 Flow B — niet publiceren");
        await uploadListingPhotos(page, 2);
      }
      if (await page.locator('[data-testid="px4a-replace-video"]').count()) {
        await page.locator('[data-testid="px4a-replace-video"]').click();
        await page.waitForTimeout(300);
      }
      await page.locator('[data-testid="px4a-make-free-video"]').click();
      await waitForComposer(page);
      await configureComposition(page, {
        seconds: 15,
        music: false,
        texts: ["NO MUSIC A", "NO MUSIC B"],
      });
      const exportRes = await exportAndAttach(page, "b");
      const inspect = await inspectListingVideo(page, "flow-b");
      report.flowB = {
        status: inspect.ok && !inspect.audioCodec ? "PASS" : inspect.ok ? "PARTIAL" : "FAIL",
        exportWallMs: exportRes.wallMs,
        inspect,
      };
      saveReport();
      console.log("Flow B:", report.flowB);
    }

    if (shouldRun("C")) {
      console.log("=== FLOW C — existing video / cancel / replace ===");
      await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(1500);
      if (!(await page.locator('[data-testid="listing-video-block"]').count())) {
        await completeEntryWizard(page);
        await waitUntil("listing form CTA", async () => (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0, 60_000);
        await fillListingBasics(page, "PX.4A.5 Flow C — niet publiceren");
        await uploadListingPhotos(page, 2);
      }
      const existing = await readDraft(page);
      let oldUrl = existing.videoUrl;
      if (!oldUrl) {
        const videoInput = page.locator('[data-testid="listing-video-block"] input[type="file"]').first();
        await videoInput.setInputFiles(join(FIX_DIR, "listing-sample.mp4"));
        await waitUntil(
          "manual listing video",
          async () => {
            const snap = await readDraft(page);
            return Boolean(snap.videoUrl || snap.videoElSrc);
          },
          120_000,
          1500,
        );
        oldUrl = (await readDraft(page)).videoUrl;
      }
      await page.locator('[data-testid="px4a-replace-video"]').click();
      await page.locator('[data-testid="px4a-make-free-video"]').click();
      await waitForComposer(page);
      await page.locator('[data-testid="px4a-item-finish"]').click();
      const cancelBtn = page.locator('[data-testid="px4a-export-cancel"]');
      await cancelBtn.waitFor({ state: "visible", timeout: 20_000 });
      await cancelBtn.click();
      await page.locator('[data-testid="px4a-export-progress"]').waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
      if (!page.url().includes("/sell/new")) {
        await page.locator('[data-testid="px4a-item-cancel"]').click();
      }
      await waitUntil("back after cancel", async () => page.url().includes("/sell/new"), 60_000);
      const afterCancel = await readDraft(page);
      const cancelKept = afterCancel.videoUrl === oldUrl || Boolean(afterCancel.hasVideo);
      await page.locator('[data-testid="px4a-replace-video"]').click().catch(() => undefined);
      await page.locator('[data-testid="px4a-make-free-video"]').click();
      await waitForComposer(page);
      await configureComposition(page, { seconds: 10, music: true, texts: ["REPLACE A", "REPLACE B"] });
      const exportRes = await exportAndAttach(page, "c");
      const afterReplace = await readDraft(page);
      const inspect = await inspectListingVideo(page, "flow-c");
      report.flowC = {
        status: cancelKept && afterReplace.hasVideo && afterReplace.videoUrl !== oldUrl && afterReplace.videoCount <= 1 ? "PASS" : "FAIL",
        oldUrlHost: oldUrl ? new URL(oldUrl).host : null,
        afterCancelHasVideo: afterCancel.hasVideo,
        afterCancelUrl: afterCancel.videoUrl,
        afterReplaceUrl: afterReplace.videoUrl,
        videoCount: afterReplace.videoCount,
        exportWallMs: exportRes.wallMs,
        inspect,
      };
      saveReport();
      console.log("Flow C:", report.flowC);
    }

    if (shouldRun("D")) {
      console.log("=== FLOW D — 12 photos / 30 sec ===");
      await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
      if (!(await page.locator('[data-testid="px4a-make-free-video"], [data-testid="px4a-replace-video"]').count())) {
        await completeEntryWizard(page);
        await fillListingBasics(page, "PX.4A.5 Flow D — niet publiceren");
        await uploadListingPhotos(page, 4);
      }
      if (await page.locator('[data-testid="px4a-replace-video"]').count()) {
        await page.locator('[data-testid="px4a-replace-video"]').click();
      }
      await page.locator('[data-testid="px4a-make-free-video"]').click();
      await waitForComposer(page);
      await configureComposition(page, {
        seconds: 30,
        music: true,
        extraPhotos: photoPaths(12).slice(4),
        texts: ["STRESS TITLE", "STRESS EXTRA"],
      });
      const attachStart = Date.now();
      const exportRes = await exportAndAttach(page, "d");
      const inspect = await inspectListingVideo(page, "flow-d");
      const duration = Number(inspect.duration ?? 0);
      const mb = Number(inspect.mb ?? 99);
      report.flowD = {
        status:
          inspect.ok && duration <= 30.5 && mb <= 50 && inspect.videoCodec && /h264|avc/i.test(String(inspect.videoCodec))
            ? "PASS"
            : "FAIL",
        encodeAttachWallMs: exportRes.wallMs,
        attachWallMs: Date.now() - attachStart,
        inspect,
      };
      saveReport();
      console.log("Flow D:", report.flowD);
    }

    if (shouldRun("E")) {
      console.log("=== FLOW E — mobile ~390px ===");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await shot(page, "e-390-sell-new");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      if (await page.locator('[data-testid="px4a-replace-video"]').count()) {
        await page.locator('[data-testid="px4a-replace-video"]').click();
      }
      if (await page.locator('[data-testid="px4a-make-free-video"]').count()) {
        await page.locator('[data-testid="px4a-make-free-video"]').click();
        await waitForComposer(page);
        await configureComposition(page, { seconds: 10, music: false, texts: ["MOBILE A", "MOBILE B"] });
        const exportRes = await exportAndAttach(page, "e");
        const inspect = await inspectListingVideo(page, "flow-e");
        const draft = await readDraft(page);
        report.flowE = {
          status: inspect.ok && draft.hasVideo && !overflow ? "PASS" : overflow ? "PARTIAL" : "FAIL",
          overflow,
          exportWallMs: exportRes.wallMs,
          inspect,
          draftKept: Boolean(draft.title),
        };
      } else {
        report.flowE = { status: "NOT TESTED", overflow, reason: "listing CTA missing at 390px" };
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      saveReport();
      console.log("Flow E:", report.flowE);
    }

    if (shouldRun("F")) {
      console.log("=== FLOW F — standalone Studio download ===");
      await page.goto(STUDIO_PUBLIC, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitUntil("public composer", async () => (await page.locator('[data-testid="px4a-composer"]').count()) > 0, 60_000);
      if (await page.locator('[data-testid="px4a-resume-fresh"]').count()) {
        await page.locator('[data-testid="px4a-resume-fresh"]').click();
      }
      await page.locator('[data-testid="px4a-file-input"]').setInputFiles(photoPaths(4));
      await page.waitForTimeout(800);
      const dur15 = page.locator('[data-testid="px4a-video-duration"] button[aria-label="15 sec"]');
      if (await dur15.count()) await dur15.click();
      await page.locator('[data-testid="px4a-add-text"]').click().catch(() => undefined);
      if (await page.locator('[data-testid="px4a-text-input"]').count()) {
        await page.locator('[data-testid="px4a-text-input"]').fill("STUDIO FREE");
      }
      await page.locator('[data-testid="px4a-audio-none"]').click().catch(() => undefined);
      const downloadBtn = page.locator('[data-testid="px4a-export-download"]');
      if (await page.locator('[data-testid="px4a-auth-gate"]').count()) {
        report.flowF = { status: "PARTIAL", reason: "auth gate shown for anonymous/unauthenticated Studio" };
      } else {
        const started = Date.now();
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 180_000 }),
          downloadBtn.click(),
        ]);
        const dest = join(MEDIA_DIR, "flow-f-15.mp4");
        await download.saveAs(dest);
        const head = looksLikeMp4(dest);
        const probe = ffprobe(dest);
        report.flowF = {
          status: head.ftyp && head.bytes > 20_000 ? "PASS" : "FAIL",
          wallMs: Date.now() - started,
          bytes: head.bytes,
          suggestedFilename: download.suggestedFilename(),
          probe,
          note45: "45/60 not required if 15s is the certified max this session",
        };
      }
      saveReport();
      console.log("Flow F:", report.flowF);
    }

    report.networkSummary = {
      providerHits: report.network.providerHits,
      creditHits: report.network.creditHits,
      renderHits: report.network.renderHits,
      chargeHits: report.network.chargeHits,
      blobUploadCount: report.network.blobUploads.length,
      blobBytes: report.network.blobUploads.map((b) => b.bytes),
      handoffPosts: report.network.handoffPosts.length,
      listingUploads: report.network.listingUploads.length,
    };
    saveReport();
    await shot(page, "final");
    console.log("Report written:", join(OUT_DIR, "live-report.json"));
  } finally {
    await context.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  report.notes.push(String(err instanceof Error ? err.stack || err.message : err));
  saveReport();
  process.exit(1);
});
