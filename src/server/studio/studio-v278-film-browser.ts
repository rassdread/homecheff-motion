/**
 * Browser certification of asynchronous film export.
 * Uses the disposable local database, a local worker, and synthetic media.
 * Does not call the live Render service or a paid provider.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { hashPassword } from "@/server/auth/session";

const execFileAsync = promisify(execFile);
const CERT_DB = "homecheff_film_cert_2u";
const FFMPEG = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
const base = process.env.FILM_CERT_BASE_URL?.trim() || "";
const password = "film-cert-local-only";

function assertLocal() {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() || "";
  if (!url) throw new Error("FILM_CERT_DATABASE_URL is not configured.");
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if ((parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") || name !== CERT_DB) {
    throw new Error("Browser certification refused a non-local database.");
  }
  if (!base.startsWith("https://127.0.0.1:")) {
    throw new Error("Browser certification must use the local HTTPS origin.");
  }
  if (!process.env.STUDIO_LOCAL_MEDIA_DIR?.trim()) {
    throw new Error("STUDIO_LOCAL_MEDIA_DIR is required.");
  }
  process.env.DATABASE_URL = url;
}

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="password"]').waitFor();
  await page.waitForFunction(() => {
    const form = document.querySelector('input[name="password"]')?.closest("form");
    return Boolean(form && Object.getOwnPropertyNames(form).some((key) => key.startsWith("__reactFiber")));
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function main() {
  assertLocal();
  const mediaDir = process.env.STUDIO_LOCAL_MEDIA_DIR!.trim();
  const { prisma } = await import("@/lib/prisma");
  const { createOwnedFilmProject } = await import("@/server/studio/studio-film-preparation");
  const { addTimelineClip, createFilmTimeline, getFilmTimeline } = await import("@/server/studio/studio-timeline-service");
  const { upsertLibraryAsset } = await import("@/server/studio-library/library-asset-service");

  const stamp = Date.now();
  const email = `v278-browser-${stamp}@example.test`;
  const otherEmail = `v278-browser-other-${stamp}@example.test`;
  const owner = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: "user" },
  });
  const other = await prisma.user.create({
    data: { email: otherEmail, passwordHash: hashPassword(password), role: "user" },
  });
  await prisma.studioAccount.create({ data: { userId: owner.id, accountType: "creator", accountStatus: "active" } });
  await prisma.studioAccount.create({ data: { userId: other.id, accountType: "creator", accountStatus: "active" } });
  await prisma.studioWallet.create({
    data: { userId: owner.id, balance: 500, promotionalBalance: 500, lifetimeGranted: 500 },
  });

  const work = await mkdtemp(path.join(mediaDir, "browser-"));
  const picture = path.join(work, "clip.mp4");
  const voice = path.join(work, "voice.wav");
  await execFileAsync(FFMPEG, ["-y", "-f", "lavfi", "-i", "color=c=0x224466:s=320x180:r=25:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", picture], { timeout: 30_000 });
  await execFileAsync(FFMPEG, ["-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=44100:duration=3", "-ac", "2", voice], { timeout: 30_000 });

  const film = await createOwnedFilmProject({ ownerId: owner.id, title: "Async browser film", idempotencyKey: `v278-browser-${stamp}` });
  if ("error" in film) throw new Error("film was not created");
  const projectId = film.projectId;
  const created = await createFilmTimeline(owner.id, projectId);
  if ("error" in created || !created.timeline?.storyboardId) throw new Error("timeline was not created");
  const video = await upsertLibraryAsset({
    ownerId: owner.id,
    projectId: projectId,
    family: "video",
    title: "picture",
    sourceKind: "v278-browser",
    sourceId: `${stamp}-picture`,
    previewUrl: pathToFileURL(picture).href,
    downloadUrl: pathToFileURL(picture).href,
    storageKey: picture,
    mimeType: "video/mp4",
    durationSeconds: 3,
    creditsSpent: 0,
  });
  const speech = await upsertLibraryAsset({
    ownerId: owner.id,
    projectId: projectId,
    family: "voice",
    title: "voice",
    sourceKind: "v278-browser",
    sourceId: `${stamp}-voice`,
    previewUrl: pathToFileURL(voice).href,
    downloadUrl: pathToFileURL(voice).href,
    storageKey: voice,
    mimeType: "audio/wav",
    durationSeconds: 3,
    creditsSpent: 0,
  });
  async function place(trackType: string, sourceId: string) {
    const current = await getFilmTimeline(owner.id, projectId);
    if ("error" in current || !current.timeline) throw new Error("timeline missing");
    const track = current.timeline.tracks.find((item) => item.type === trackType);
    if (!track) throw new Error(trackType);
    const added = await addTimelineClip({
      ownerId: owner.id,
      projectId,
      revision: current.timeline.revision,
      trackId: track.id,
      sourceKind: "library_asset",
      sourceId,
      startMs: 0,
      durationMs: 3000,
    });
    if ("error" in added) throw new Error(`${trackType} was rejected`);
  }
  await place("VIDEO", video.id);
  await place("DIALOGUE", speech.id);

  const empty = await createOwnedFilmProject({ ownerId: owner.id, title: "Empty async film", idempotencyKey: `v278-empty-${stamp}` });
  if ("error" in empty) throw new Error("empty film was not created");
  await createFilmTimeline(owner.id, empty.projectId);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const forbidden: string[] = [];
  page.on("request", (request) => {
    try {
      const host = new URL(request.url()).hostname;
      if (host.endsWith("homecheff.eu") || host === "api.openai.com" || host.endsWith("stripe.com") || host.endsWith("onrender.com")) {
        forbidden.push(host);
      }
    } catch {
      /* ignore non-URL requests */
    }
  });
  try {
    await login(page, email);
    await page.goto(`${base}/studio/projects/${projectId}?section=timeline`, { waitUntil: "domcontentloaded" });
    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await page.getByTestId("film-export-mp4").click();
    await page.getByTestId("film-export-status").waitFor();
    const download = await downloadPromise;
    const filePath = path.join(tmpdir(), `v278-browser-${stamp}.mp4`);
    await download.saveAs(filePath);
    const info = await execFileAsync("/opt/homebrew/bin/ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_name,codec_type",
      "-of", "json",
      filePath,
    ]);
    const parsed = JSON.parse(info.stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; codec_name?: string }>;
    };
    const videoCodec = parsed.streams?.find((stream) => stream.codec_type === "video")?.codec_name;
    const audioCodec = parsed.streams?.find((stream) => stream.codec_type === "audio")?.codec_name;
    assert.equal(videoCodec, "h264");
    assert.equal(audioCodec, "aac");
    assert.ok(Number(parsed.format?.duration ?? 0) > 2.5);

    await page.goto(`${base}/projects`, { waitUntil: "domcontentloaded" });
    await page.goto(`${base}/studio/projects/${projectId}?section=timeline`, { waitUntil: "domcontentloaded" });
    const again = page.getByTestId("film-export-download");
    await again.waitFor();
    const jobId = await again.getAttribute("data-job-id");
    assert.ok(jobId);
    const second = page.waitForEvent("download", { timeout: 30_000 });
    await again.click();
    await second;

    const otherContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const otherPage = await otherContext.newPage();
    await login(otherPage, otherEmail);
    const isolated = await otherPage.evaluate(async ({ projectId, exportJobId }) => {
      const response = await fetch(`/api/studio/projects/${projectId}/timeline/render?jobId=${exportJobId}`, { credentials: "include" });
      return response.status;
    }, { projectId: projectId, exportJobId: jobId });
    assert.equal(isolated, 404);
    await otherContext.close();

    await page.goto(`${base}/studio/projects/${empty.projectId}?section=timeline`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("film-export-mp4").click();
    await page.getByRole("alert").waitFor({ timeout: 60_000 });

    const wallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: owner.id } });
    const job = await prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: jobId! } });
    assert.equal(wallet.balance, 500);
    assert.equal(wallet.lifetimeSpent, 0);
    assert.equal(job.creditsCharged, 0);
    assert.equal(job.creditCost, 0);
    assert.equal(forbidden.length, 0);
    console.log(`V278_BROWSER_JOB=${jobId}`);
    console.log(`V278_BROWSER_WALLET=${wallet.balance}`);
    console.log("V278_BROWSER_PASS=1");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "browser certification failed");
  process.exit(1);
});
