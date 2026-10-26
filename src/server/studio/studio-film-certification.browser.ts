/**
 * Browser certification against the disposable local database and local HTTPS server.
 * Refuses any database that is not homecheff_film_cert_2u on 127.0.0.1.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { hashPassword } from "@/server/auth/session";
import { resolveFfmpegForTextOverlay } from "@/lib/video-ffmpeg-capability";

const execFileAsync = promisify(execFile);

const CERT_DB = "homecheff_film_cert_2u";
const base = process.env.FILM_CERT_BASE_URL?.trim() || "https://127.0.0.1:3456";
const password = "film-cert-local-only";

function assertLocal() {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" || name !== CERT_DB) {
    throw new Error("Browser certification refused a non-local database.");
  }
  if (!base.startsWith("https://127.0.0.1:")) {
    throw new Error("Browser certification must use the local HTTPS origin.");
  }
  process.env.DATABASE_URL = url;
}

async function main() {
assertLocal();

const { prisma } = await import("@/lib/prisma");

const email = `film-browser-${Date.now()}@example.test`;
const user = await prisma.user.create({
  data: { email, passwordHash: hashPassword(password), role: "user" },
});
await prisma.studioAccount.create({
  data: { userId: user.id, accountType: "creator", accountStatus: "active" },
});
await prisma.studioWallet.create({
  data: {
    userId: user.id,
    balance: 500,
    promotionalBalance: 500,
    lifetimeGranted: 500,
  },
});
const characterA = await prisma.studioCharacter.create({
  data: {
    ownerId: user.id,
    name: "Character A",
    slug: `character-a-${Date.now()}`,
    role: "human",
    referenceImageUrl: "https://cert.local/masters/a.png",
    referenceStorageKey: "local/a",
  },
});
const characterB = await prisma.studioCharacter.create({
  data: {
    ownerId: user.id,
    name: "Character B",
    slug: `character-b-${Date.now()}`,
    role: "human",
    referenceImageUrl: "https://cert.local/masters/b.png",
    referenceStorageKey: "local/b",
  },
});

const forbiddenHosts: string[] = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ ignoreHTTPSErrors: true });
page.on("request", (request) => {
  try {
    const host = new URL(request.url()).hostname;
    if (host.endsWith("homecheff.eu") || host === "api.openai.com" || host.endsWith("stripe.com")) {
      forbiddenHosts.push(host);
    }
  } catch {
    /* ignore */
  }
});

try {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });

  await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  await page.goto(`${base}/projects`, { waitUntil: "domcontentloaded" });
  const title = page.locator('input[name="filmTitle"]').filter({ visible: true }).first();
  await title.waitFor();
  await title.fill("Browser certification film");
  const createFilm = page.getByRole("button", { name: /Nieuwe film|New film/ }).filter({ visible: true }).first();
  await createFilm.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => {
      const buttons = [...document.querySelectorAll("form button[type='submit']")];
      return buttons.some((button) => button instanceof HTMLButtonElement && !button.disabled && button.getClientRects().length > 0);
    },
    undefined,
    { timeout: 60000 },
  );
  await createFilm.click();
  await page.waitForURL(/\/studio\/projects\/[^/]+\?section=scenes/, { timeout: 30000 });
  const projectId = page.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
  assert.match(projectId, /^c[a-z0-9]+$/);
  await page.getByText(/storyboard van deze film is gekoppeld|storyboard is linked/i).waitFor();

  const addScene = page.getByRole("button", { name: /Scène toevoegen|Add scene/ });
  await addScene.click();
  await page.getByRole("button", { name: /1\. Nieuwe scène|1\. New scene/ }).waitFor();
  await addScene.click();
  await page.getByRole("button", { name: /2\. Nieuwe scène|2\. New scene/ }).waitFor();

  await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId,
      family: "character",
      title: "Character A",
      sourceKind: "passion_character_master",
      sourceId: `browser-a-${projectId}`,
      metadataJson: { characterId: characterA.id },
    },
  });
  await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId,
      family: "character",
      title: "Character B",
      sourceKind: "passion_character_master",
      sourceId: `browser-b-${projectId}`,
      metadataJson: { characterId: characterB.id },
    },
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.getByRole("checkbox", { name: "Character A" }).check();
  await page.getByRole("button", { name: /Scène opslaan|Save scene/ }).click();
  await page.getByRole("button", { name: /2\. Nieuwe scène|2\. New scene/ }).click();
  await page.getByRole("checkbox", { name: "Character B" }).check();
  await page.getByRole("button", { name: /Scène opslaan|Save scene/ }).click();
  await page.waitForTimeout(500);

  await page.goto(`${base}/projects`, { waitUntil: "domcontentloaded" });
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /1\. Nieuwe scène|1\. New scene/ }).click();
  assert.equal(await page.getByRole("checkbox", { name: "Character A" }).isChecked(), true);
  await page.getByRole("button", { name: /2\. Nieuwe scène|2\. New scene/ }).click();
  assert.equal(await page.getByRole("checkbox", { name: "Character B" }).isChecked(), true);
  assert.equal(await page.getByRole("checkbox", { name: "Character A" }).isChecked(), false);

  const storyboard = await prisma.studioCreativeProject.findUniqueOrThrow({
    where: { id: projectId },
    select: { storyboardId: true, title: true, ownerId: true },
  });
  assert.equal(storyboard.title, "Browser certification film");
  assert.equal(storyboard.ownerId, user.id);
  assert.ok(storyboard.storyboardId);
  const scenes = await prisma.studioScene.findMany({
    where: { storyboardId: storyboard.storyboardId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  assert.equal(scenes.length, 2);

  const generated = await page.evaluate(
    async ({ storyboardId, sceneId }) => {
      const response = await fetch(`/api/studio/storyboards/${storyboardId}/scenes/${sceneId}/images`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const body = (await response.json().catch(() => ({}))) as { code?: string; error?: string; image?: { id?: string } };
      return { status: response.status, code: body.code ?? "", imageId: body.image?.id ?? "", error: body.error ?? "" };
    },
    { storyboardId: storyboard.storyboardId, sceneId: scenes[1]!.id },
  );
  assert.equal(generated.status, 201, `${generated.code} ${generated.error ?? ""}`);
  const image = await prisma.studioSceneImage.findFirstOrThrow({
    where: { sceneId: scenes[1]!.id },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(image.provider, "mock");
  assert.equal(image.status, "completed");
  assert.match(image.imageUrl, /^file:\/\//);

  const mediaDir = process.env.STUDIO_LOCAL_MEDIA_DIR?.trim();
  if (!mediaDir) throw new Error("STUDIO_LOCAL_MEDIA_DIR is required for the local film.");
  const lines = ["Het begon met één klik.", "The kitchen is awake."];
  const videos: string[] = [];
  const voices: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    const dialogue = await page.evaluate(
      async ({ projectId, sceneId, dialogueText }) => {
        const response = await fetch(`/api/studio/projects/${projectId}/scenes/${sceneId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dialogueText, subtitleText: dialogueText }),
        });
        return response.status;
      },
      { projectId, sceneId: scene.id, dialogueText: lines[index] ?? lines[0]! },
    );
    assert.equal(dialogue, 200);
    const still: { status: number; imageId: string; code: string } = await page.evaluate(
      async ({ storyboardId, sceneId }) => {
        const response = await fetch(`/api/studio/storyboards/${storyboardId}/scenes/${sceneId}/images`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true }),
        });
        const body = (await response.json().catch(() => ({}))) as { image?: { id?: string }; code?: string };
        return { status: response.status, imageId: body.image?.id ?? "", code: body.code ?? "" };
      },
      { storyboardId: storyboard.storyboardId, sceneId: scene.id },
    );
    assert.ok(still.status === 201 || (still.status === 200 && still.imageId.length > 0), still.code);
    const video = await page.evaluate(
      async ({ projectId, sceneId, sceneImageId }) => {
        const response = await fetch(`/api/studio/projects/${projectId}/scenes/${sceneId}/video`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sceneImageId, forceProvider: "mock" }),
        });
        const body = (await response.json().catch(() => ({}))) as { assetId?: string; code?: string; creditsSpent?: number };
        return { status: response.status, assetId: body.assetId ?? "", code: body.code ?? "", creditsSpent: body.creditsSpent ?? -1 };
      },
      { projectId, sceneId: scene.id, sceneImageId: still.imageId },
    );
    assert.equal(video.status, 201, video.code);
    assert.equal(video.creditsSpent, 0);
    videos.push(video.assetId);
    const voice = await page.evaluate(
      async ({ projectId, sceneId }) => {
        const response = await fetch(`/api/studio/projects/${projectId}/scenes/${sceneId}/dialogue`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceProvider: "mock" }),
        });
        const body = (await response.json().catch(() => ({}))) as { assetId?: string; code?: string; creditsSpent?: number };
        return { status: response.status, assetId: body.assetId ?? "", code: body.code ?? "", creditsSpent: body.creditsSpent ?? -1 };
      },
      { projectId, sceneId: scene.id },
    );
    assert.equal(voice.status, 201, voice.code);
    assert.equal(voice.creditsSpent, 0);
    voices.push(voice.assetId);
  }

  await mkdir(mediaDir, { recursive: true });
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const musicPath = `${mediaDir}/browser-bed.wav`;
  await execFileAsync(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=196:sample_rate=44100:duration=8", "-ac", "2", musicPath]);
  const music = await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId,
      family: "music",
      title: "Mock bed",
      sourceKind: "scene_music",
      sourceId: `${projectId}-browser-bed`,
      previewUrl: pathToFileURL(musicPath).href,
      downloadUrl: pathToFileURL(musicPath).href,
      storageKey: musicPath,
      mimeType: "audio/wav",
      durationSeconds: 8,
      creditsSpent: 0,
    },
  });

  const placed = await page.evaluate(
    async ({ projectId, videos, voices, musicAssetId }) => {
      const response = await fetch(`/api/studio/projects/${projectId}/timeline`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "place-media", videoAssetIds: videos, dialogueAssetIds: voices, musicAssetId }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
        timeline?: { tracks?: Array<{ type: string; clips: Array<{ sourceId: string; startMs: number }> }> };
      };
      const picture = body.timeline?.tracks?.find((track) => track.type === "VIDEO")?.clips.slice().sort((left, right) => left.startMs - right.startMs) ?? [];
      return { status: response.status, code: body.code ?? "", order: picture.map((clip) => clip.sourceId) };
    },
    { projectId, videos, voices, musicAssetId: music.id },
  );
  assert.equal(placed.status, 200, placed.code);
  assert.deepEqual(placed.order, videos);

  const reversed = await page.evaluate(async (projectId) => {
    const response = await fetch(`/api/studio/projects/${projectId}/timeline`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reverse-story" }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      timeline?: { revision?: number; tracks?: Array<{ type: string; clips: Array<{ sourceId: string; startMs: number }> }> };
    };
    const picture = body.timeline?.tracks?.find((track) => track.type === "VIDEO")?.clips.slice().sort((left, right) => left.startMs - right.startMs) ?? [];
    return { status: response.status, code: body.code ?? "", first: picture[0]?.sourceId ?? "", start: picture[0]?.startMs ?? -1, revision: body.timeline?.revision ?? -1 };
  }, projectId);
  assert.equal(reversed.status, 200, reversed.code);
  assert.equal(reversed.first, videos[1]);
  assert.equal(reversed.start, 0);

  await page.goto(`${base}/studio/projects/${projectId}?section=timeline`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /^Timeline$/ }).waitFor();

  page.setDefaultTimeout(180000);
  const rendered = await page.evaluate(async ({ projectId, revision }) => {
    const response = await fetch(`/api/studio/projects/${projectId}/timeline/render`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, width: 720, height: 1280, burnLanguage: "nl" }),
    });
    const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
    return {
      status: response.status,
      type: response.headers.get("content-type") ?? "",
      assetId: response.headers.get("x-studio-library-asset") ?? "",
      bytes,
    };
  }, { projectId, revision: reversed.revision });
  assert.equal(rendered.status, 200, String(rendered.status));
  assert.match(rendered.type, /video\/mp4/);
  assert.ok(rendered.bytes > 1000);
  assert.match(rendered.assetId, /^c[a-z0-9]+$/);

  await page.goto(`${base}/studio/projects/${projectId}?section=export`, { waitUntil: "domcontentloaded" });
  const player = page.locator("video");
  await player.waitFor();
  const playback = await player.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    await new Promise<void>((resolve, reject) => {
      if (media.readyState >= 1 && Number.isFinite(media.duration)) {
        resolve();
        return;
      }
      media.addEventListener("loadedmetadata", () => resolve(), { once: true });
      media.addEventListener("error", () => reject(new Error("video failed to load")), { once: true });
    });
    await media.play();
    return { duration: media.duration, width: media.videoWidth, height: media.videoHeight, paused: media.paused };
  });
  assert.ok(playback.duration > 0);
  assert.equal(playback.paused, false);
  assert.equal(playback.width, 720);
  assert.equal(playback.height, 1280);

  await page.goto(`${base}/studio/projects/${projectId}?section=overview`, { waitUntil: "domcontentloaded" });
  await page.goto(`${base}/studio/projects/${projectId}?section=media`, { waitUntil: "domcontentloaded" });
  await page.goto(`${base}/studio/projects/${projectId}?section=export`, { waitUntil: "domcontentloaded" });
  await page.locator("video").waitFor();
  await page.getByRole("link", { name: /Download|Downloaden/ }).waitFor();

  await page.getByRole("button", { name: /Profile|Profiel/ }).click();
  await page.getByRole("button", { name: /Logout|Uitloggen/ }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  const projectsApi = await page.evaluate(async () => {
    const response = await fetch("/api/studio/projects", { credentials: "include" });
    return response.status;
  });
  assert.equal(projectsApi, 401);
  assert.deepEqual(forbiddenHosts, []);
  console.log(`BROWSER_PROJECT_ID=${projectId}`);
} finally {
  await browser.close();
  await prisma.$disconnect();
}
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "browser certification failed";
  console.error(message);
  process.exit(1);
});
