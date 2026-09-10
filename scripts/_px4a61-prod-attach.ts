#!/usr/bin/env npx tsx
/**
 * PX.4A.6.1 Production attach regression — untracked helper.
 * HomeCheff sell/new → 4 listing photos → from-item → 15s → Video gebruiken.
 * Does not publish. Does not change encoder code.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Cookie, type Page } from "playwright";

const HC_ORIGIN = "https://homecheff.eu";
const STUDIO_ORIGIN = "https://studio.homecheff.eu";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_DIR = process.env.PX4A5_CHROME_PROFILE?.trim() || join(REPO_ROOT, ".px4a4-chrome-profile");
const OUT_DIR = join(REPO_ROOT, "docs/audits/px4a61-prod-cert");
const FIX_DIR = join(REPO_ROOT, "docs/audits/px4a5-human-cert/fixtures");
const SHOT_DIR = join(OUT_DIR, "shots");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|api\.openai|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;

const network = {
  providerHits: [] as string[],
  creditHits: [] as string[],
  renderHits: [] as string[],
  handoffPosts: [] as string[],
};

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
}

function writePhotos(): string[] {
  mkdirSync(FIX_DIR, { recursive: true });
  const colors = ["red", "green", "blue", "orange"] as const;
  return colors.map((color, i) => {
    const dest = join(FIX_DIR, `px4a61-${color}.png`);
    if (!existsSync(dest)) {
      ffmpeg(["-f", "lavfi", "-i", `color=c=${color}:s=720x1280:d=1`, "-frames:v", "1", dest]);
    }
    void i;
    return dest;
  });
}

function hasHcSessionCookie(cookies: Cookie[]): boolean {
  return cookies.some((c) => {
    const n = c.name.toLowerCase();
    return n.includes("next-auth.session-token");
  });
}

async function probeHc(context: BrowserContext) {
  const cookies = await context.cookies(HC_ORIGIN);
  const cookiePresent = hasHcSessionCookie(cookies);
  const res = await context.request.get(`${HC_ORIGIN}/api/user/me`, { timeout: 20_000, failOnStatusCode: false });
  return { cookiePresent, apiOk: res.status() === 200, status: res.status() };
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

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${Date.now()}-${name}.png`), fullPage: false }).catch(() => undefined);
}

async function readDraft(page: Page) {
  return page.evaluate(() => {
    let raw: { title?: string; images?: unknown[]; video?: { url?: string } | null } | null = null;
    try {
      const stored = window.sessionStorage.getItem("hc-px4a-item-form:v1");
      raw = stored ? (JSON.parse(stored) as typeof raw) : null;
    } catch {
      raw = null;
    }
    const videoEl = document.querySelector("video");
    return {
      path: location.pathname,
      title: (raw?.title || "").trim(),
      photoCount: raw?.images?.length ?? 0,
      hasVideo: Boolean(raw?.video?.url || videoEl?.currentSrc || videoEl?.src),
      videoUrl: raw?.video?.url || videoEl?.currentSrc || videoEl?.src || null,
      videoCount: document.querySelectorAll("video").length,
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
  if (await page.getByText("Kies een groep").count()) {
    await page.locator("section button").filter({ hasNotText: "Terug" }).nth(0).click();
    await page.waitForTimeout(400);
  }
  if (await page.getByText("Wat past hier het beste?").count()) {
    await page.locator("section button").filter({ hasNotText: /Terug|groep/ }).nth(0).click();
    await page.waitForTimeout(300);
    const next = page.getByRole("button", { name: /Verder/ });
    if (await next.count()) await next.first().click();
    await page.waitForTimeout(400);
  }
  if (await page.getByRole("button", { name: "Verder" }).count()) {
    await page.getByRole("button", { name: "Verder" }).last().click();
    await page.waitForTimeout(600);
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const photos = writePhotos();
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
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
    if (PROVIDER_RE.test(url)) network.providerHits.push(`${req.method()} ${url}`);
    if (CREDIT_RE.test(url)) network.creditHits.push(`${req.method()} ${url}`);
    if (/\/api\/.*render|server-ffmpeg|ffmpeg-static/i.test(url)) network.renderHits.push(`${req.method()} ${url}`);
    if (/\/api\/photo-video\/export-handoff|\/api\/studio\/px4a-export-attach/.test(url) && req.method() === "POST") {
      network.handoffPosts.push(url);
    }
  });

  const result: Record<string, unknown> = { startedAt: new Date().toISOString(), network };

  try {
    const probe = await probeHc(context);
    result.hcAuth = probe;
    if (!probe.apiOk) {
      console.log("PAUSE — log in as a HomeCheff seller in the Chrome window (do not publish).");
      const deadline = Date.now() + 300_000;
      while (Date.now() < deadline) {
        const again = await probeHc(context);
        if (again.apiOk) break;
        await page.waitForTimeout(2000);
      }
      const ready = await probeHc(context);
      if (!ready.apiOk) throw new Error("HomeCheff seller login not confirmed");
    }

    await page.goto(`${HC_ORIGIN}/sell/new`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1200);
    await completeEntryWizard(page);
    await waitUntil("listing CTA", async () => (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0, 60_000);

    const titleBox = page.getByLabel("Titel", { exact: true });
    if (await titleBox.count()) await titleBox.fill("PX.4A.6.1 attach — niet publiceren");
    else await page.locator("input[required]").first().fill("PX.4A.6.1 attach — niet publiceren");
    const desc = page.getByLabel(/Omschrijving|Vertel wat je aanbiedt/);
    if (await desc.count()) await desc.first().fill("PX.4A.6.1 disposable listing. Do not publish.");
    const price = page.locator('input[inputmode="decimal"]').first();
    if (await price.count()) await price.fill("3.50");

    const gallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
    await gallery.setInputFiles(photos);
    await waitUntil(
      "4 listing photos",
      async () => {
        const uploading = await page.getByText("Uploaden...").count();
        const uploaded = await page.getByText(/Geüploade foto's \(4\)/).count();
        const counter = await page.getByText(/4\/\d+ foto/).count();
        return uploading === 0 && (uploaded > 0 || counter > 0);
      },
      90_000,
      1500,
    );

    await page.locator('[data-testid="px4a-make-free-video"]').click();
    await waitUntil(
      "composer",
      async () => page.url().includes("/studio/photo-video") && (await page.locator('[data-testid="px4a-composer"]').count()) > 0,
      90_000,
    );
    if (await page.locator('[data-testid="px4a-resume-fresh"]').count()) {
      await page.locator('[data-testid="px4a-resume-fresh"]').click();
      await page.waitForTimeout(400);
    }
    await shot(page, "composer");

    await page.locator('[data-testid="px4a-add-photo-tile"]').waitFor({ state: "visible", timeout: 15_000 });
    await page.getByTestId("px4a-photo-inspector").waitFor({ state: "visible" });

    const durationChip = page.locator('[data-testid="px4a-video-duration"] button[aria-label="15 sec"]');
    if (await durationChip.count()) await durationChip.click();
    await page.locator('[data-testid="px4a-audio-none"]').click().catch(() => undefined);

    await page.getByTestId("px4a-photo-0").locator("button[aria-pressed]").first().click();
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("ALPHA");
    await page.getByTestId("px4a-movement-photo").getByRole("button", { name: /Inzoomen|Zoom in/ }).click();

    await page.getByTestId("px4a-photo-1").locator("button[aria-pressed]").first().click();
    await page.getByTestId("px4a-photo-inspector").filter({ hasText: /Foto 2 aanpassen|Edit photo 2/ }).waitFor();
    if (await page.getByTestId("px4a-text-input").count()) {
      const copied = await page.getByTestId("px4a-text-input").inputValue();
      if (copied === "ALPHA") throw new Error("overlay leaked onto photo 2");
    }
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("BETA");
    await page.getByTestId("px4a-movement-photo").getByRole("button", { name: /Links → rechts|Left → right/ }).click();

    await page.getByTestId("px4a-photo-0").locator("button[aria-pressed]").first().click();
    await page.getByTestId("px4a-text-input").waitFor();
    const back = await page.getByTestId("px4a-text-input").inputValue();
    if (back !== "ALPHA") throw new Error(`photo 1 text expected ALPHA, got ${back}`);
    result.inspectorIsolation = "PASS";
    await shot(page, "edited");

    const started = Date.now();
    await page.getByTestId("px4a-item-finish").click();
    await waitUntil(
      "back on listing",
      async () => {
        const err = await page.locator('[data-testid="px4a-export-error"]').textContent().catch(() => null);
        if (err && err.trim()) throw new Error(`export error: ${err}`);
        return page.url().includes("/sell/new") && !page.url().includes("studio.homecheff");
      },
      180_000,
      1500,
    );
    await waitUntil("video attached", async () => (await readDraft(page)).hasVideo, 120_000, 1500);
    const draft = await readDraft(page);
    result.exportWallMs = Date.now() - started;
    result.draft = draft;
    result.oneVideo = draft.videoCount <= 1 && draft.hasVideo;
    result.photosKept = draft.photoCount >= 4;
    result.unpublished = page.url().includes("/sell/new");

    if (!draft.videoUrl?.startsWith("https://")) throw new Error("no https listing video");
    const dest = join(OUT_DIR, "attached.mp4");
    const res = await fetch(draft.videoUrl);
    if (!res.ok) throw new Error(`download ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    const buf = readFileSync(dest);
    const ftyp = buf.subarray(0, 32).toString("latin1").includes("ftyp");
    const probeRaw = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type", "-of", "json", dest],
      { encoding: "utf8" },
    );
    const media = JSON.parse(probeRaw) as {
      format?: { duration?: string; size?: string };
      streams?: { codec_type?: string; codec_name?: string }[];
    };
    const video = media.streams?.find((s) => s.codec_type === "video");
    result.mp4 = {
      bytes: buf.byteLength,
      ftyp,
      duration: media.format?.duration ? Number(media.format.duration) : null,
      videoCodec: video?.codec_name ?? null,
      audioCodec: media.streams?.find((s) => s.codec_type === "audio")?.codec_name ?? null,
      urlHost: new URL(draft.videoUrl).host,
    };
    await shot(page, "attached");
    result.status =
      ftyp &&
      buf.byteLength > 20_000 &&
      (video?.codec_name === "h264" || video?.codec_name === "avc1") &&
      draft.hasVideo &&
      draft.photoCount >= 4 &&
      network.providerHits.length === 0 &&
      network.creditHits.length === 0
        ? "PASS"
        : "FAIL";
  } catch (err) {
    result.status = "FAIL";
    result.error = err instanceof Error ? err.message : String(err);
    await shot(page, "fail").catch(() => undefined);
  } finally {
    result.finishedAt = new Date().toISOString();
    result.network = network;
    writeFileSync(join(OUT_DIR, "attach.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await context.close();
  }
  if (result.status !== "PASS") process.exit(1);
}

void main();
