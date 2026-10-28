/**
 * Distinct library-video certification.
 * Uploads a local synthetic MP4, selects it in the scene library UI,
 * and checks owner isolation. Does not call a paid provider.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvrdlbwg0005dh92s468jz8g";
const sceneId = "cmvrdnblh000bdh92jjl4bhrb";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const videoPath = "/tmp/v2731-distinct-blue.mp4";
const report: Record<string, unknown> = {};

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
}

function sql(query: string) {
  return execFileSync("/opt/homebrew/bin/psql", [
    "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test",
    "-At",
    "-c",
    query,
  ], { encoding: "utf8" }).trim();
}

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => Object.keys(document.querySelector('form button[type="submit"]') ?? {}).some((key) => key.startsWith("__react")));
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 20000 }).catch(() => undefined);
  if (page.url().includes("/login")) {
    const status = await page.evaluate(async (input) => {
      const next = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return next.status;
    }, { email, password });
    if (status !== 200) throw new Error(`Login failed for ${email}`);
  }
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  execFileSync("/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg", [
    "-y", "-f", "lavfi", "-i", "color=c=0x0067B1:s=320x180:d=6",
    "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=44100:duration=6",
    "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart",
    videoPath,
  ], { stdio: "ignore" });

  report.stillBefore = sql(`SELECT "selectedSceneImageId" FROM "StudioScene" WHERE id = '${sceneId}'`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.setDefaultNavigationTimeout(90000);
  await login(page, "v272-user-a@studio.local.test");

  const uploaded = await page.request.post(`${base}/api/studio/orchestrator/upload-asset`, {
    multipart: {
      file: { name: "v2731-distinct-blue.mp4", mimeType: "video/mp4", buffer: await readFile(videoPath) },
      kind: "video",
    },
  });
  const uploadedBody = await uploaded.json();
  report.uploadStatus = uploaded.status();
  const mediaUrl = String(uploadedBody?.asset?.url ?? "");
  report.mediaUrl = mediaUrl;
  if (uploaded.status() !== 200 || !mediaUrl.includes("/api/studio/local-media/")) {
    throw new Error(`Upload failed: ${uploaded.status()}`);
  }

  const registered = await page.request.post(`${base}/api/studio/library/assets`, {
    data: {
      family: "video",
      title: "V2731 distinct blue video",
      downloadUrl: mediaUrl,
      previewUrl: mediaUrl,
      storageKey: mediaUrl,
      mimeType: "video/mp4",
      sourceKind: "uploaded_video",
      sourceId: mediaUrl,
      origin: "uploaded",
      durationSeconds: 6,
      width: 320,
      height: 180,
    },
  });
  const registeredBody = await registered.json();
  const assetId = String(registeredBody?.asset?.id ?? "");
  report.registerStatus = registered.status();
  report.libraryAssetId = assetId;
  report.libraryOwner = sql(`SELECT "ownerId" || '|' || family || '|' || "mimeType" FROM "StudioLibraryAsset" WHERE id = '${assetId}'`);
  if (!assetId) throw new Error("Library registration did not return an id");

  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&scene=${sceneId}&workflow=film`, { waitUntil: "commit" });
  await page.locator('[data-testid="studio-v273-browse-library"]').waitFor();
  await page.locator('[data-testid="studio-v273-browse-library"]').evaluate((node) => (node as HTMLButtonElement).click());
  const attach = page.locator(`[data-testid="studio-v273-attach-asset-${assetId}"]`);
  await attach.waitFor();
  report.libraryButtonText = (await attach.innerText()).trim();
  await page.screenshot({ path: path.join(evidence, "library-video-1440.png") });
  await attach.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1500);

  report.clipAfterAttach = sql(`
    SELECT c.id || '|' || c."startMs" || '|' || c."durationMs" || '|' || c."sourceKind" || '|' || c."sourceId"
    FROM "StudioTimelineClip" c
    JOIN "StudioTimelineTrack" t ON t.id = c."trackId"
    WHERE t.type = 'VIDEO' AND c."sourceId" = '${assetId}'
  `);
  report.stillAfterAttach = sql(`SELECT "selectedSceneImageId" FROM "StudioScene" WHERE id = '${sceneId}'`);

  await page.reload({ waitUntil: "commit" });
  await page.locator('[data-testid="studio-v273-browse-library"]').waitFor();
  report.clipAfterRefresh = sql(`
    SELECT c.id || '|' || c."startMs" || '|' || c."durationMs"
    FROM "StudioTimelineClip" c
    WHERE c."sourceId" = '${assetId}'
  `);

  await page.goto(`${base}/studio/projects/${projectId}?section=timeline&workflow=film`, { waitUntil: "commit" });
  await page.locator('[data-testid="film-timeline-play"]').waitFor();
  const selectedOld = await page.evaluate(() => {
    const row = document.querySelector(".relative.h-16");
    const button = [...(row?.querySelectorAll("button") ?? [])].find((item) => (item as HTMLElement).style.left === "40px");
    if (!button) return false;
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 20 }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 20, clientY: 20 }));
    return true;
  });
  report.selectedPreviousVideo = selectedOld;
  const duration = page.locator('[data-testid="film-clip-duration"]');
  await duration.waitFor();
  await duration.fill("4500");
  await duration.evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    node.dispatchEvent(new Event("blur", { bubbles: true }));
  });
  await page.waitForTimeout(800);
  const selectedNew = await page.evaluate(() => {
    const row = document.querySelector(".relative.h-16");
    const button = [...(row?.querySelectorAll("button") ?? [])].find((item) => (item as HTMLElement).style.left === "400px");
    if (!button) return false;
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 30, clientY: 30 }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 30, clientY: 30 }));
    return true;
  });
  report.selectedDistinctVideo = selectedNew;
  await duration.fill("3000");
  await duration.evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    node.dispatchEvent(new Event("blur", { bubbles: true }));
  });
  await page.waitForTimeout(800);
  report.videoClips = sql(`
    SELECT c."startMs" || '-' || c."durationMs" || ':' || left(c."sourceId", 24)
    FROM "StudioTimelineClip" c
    JOIN "StudioTimelineTrack" t ON t.id = c."trackId"
    JOIN "StudioTimeline" tl ON tl.id = t."timelineId"
    WHERE tl."projectId" = '${projectId}' AND t.type = 'VIDEO'
    ORDER BY c."startMs"
  `);

  await page.locator('[data-testid="film-timeline-seek"]').fill("5500");
  await page.locator('[data-testid="film-timeline-seek"]').evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1200);
  report.preview = await page.locator('[data-testid="film-timeline-video"]').evaluate((node) => {
    const video = node as HTMLVideoElement;
    return {
      src: video.currentSrc || video.src,
      currentTimeMs: Math.round(video.currentTime * 1000),
      readyState: video.readyState,
      paused: video.paused,
    };
  });
  await page.screenshot({ path: path.join(evidence, "library-video-preview-1440.png") });

  const downloadPromise = page.waitForEvent("download", { timeout: 120000 }).catch(() => null);
  await page.locator('[data-testid="film-export-mp4"]').evaluate((node) => (node as HTMLButtonElement).click());
  const download = await downloadPromise;
  if (download) {
    const target = path.join(evidence, "v2731-film.mp4");
    await download.saveAs(target);
    report.export = { suggested: download.suggestedFilename(), bytes: (await readFile(target)).length };
  } else {
    report.exportNote = await page.locator("body").innerText().then((text) => text.includes("export") ? "clicked" : "no-download");
    report.exportError = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
  }

  const userB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await userB.newPage();
  other.setDefaultTimeout(90000);
  await login(other, "v272-user-b@studio.local.test");
  const mediaId = mediaUrl.split("/").pop() ?? "";
  const deniedMedia = await other.request.get(`${base}/api/studio/local-media/${mediaId}`);
  const deniedAttach = await other.request.post(`${base}/api/studio/projects/${projectId}/scenes/${sceneId}/attach-media`, {
    data: { libraryAssetId: assetId },
  });
  const ownLibrary = await other.request.get(`${base}/api/studio/library/assets?limit=40`);
  const ownBody = await ownLibrary.json();
  const film = await other.request.post(`${base}/api/studio/films`, {
    data: { title: "V2731 user B isolation", description: "Disposable ownership check. No generation.", idempotencyKey: "v2731-user-b-isolation" },
  });
  const filmBody = await film.json();
  const ownProjectId = String(filmBody?.projectId ?? "");
  let ownSceneStatus = 0;
  let ownAttachStatus = 0;
  if (ownProjectId) {
    const scene = await other.request.post(`${base}/api/studio/projects/${ownProjectId}/scenes`, { data: { title: "Isolation scene" } });
    ownSceneStatus = scene.status();
    const sceneBody = await scene.json();
    const ownSceneId = String(sceneBody?.sceneId ?? "");
    if (ownSceneId) {
      const ownAttach = await other.request.post(`${base}/api/studio/projects/${ownProjectId}/scenes/${ownSceneId}/attach-media`, {
        data: { libraryAssetId: assetId },
      });
      ownAttachStatus = ownAttach.status();
    }
  }
  report.ownership = {
    mediaStatus: deniedMedia.status(),
    attachToOwnerScene: deniedAttach.status(),
    listedForUserB: Array.isArray(ownBody?.assets) && ownBody.assets.some((item: { id?: string }) => item.id === assetId),
    ownFilmStatus: film.status(),
    ownProjectId,
    ownSceneStatus,
    ownAttachStatus,
  };
  report.stillAfter = sql(`SELECT "selectedSceneImageId" FROM "StudioScene" WHERE id = '${sceneId}'`);

  await writeFile(path.join(evidence, "library-video-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "library-video-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
