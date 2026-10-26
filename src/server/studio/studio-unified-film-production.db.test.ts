/**
 * Disposable local PostgreSQL certification for the unified film pipeline.
 * Refuses every URL that is not homecheff_film_cert_2u on localhost.
 * This file is not part of the default npm test script.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { hashPassword } from "@/server/auth/session";

const execFileAsync = promisify(execFile);
const CERT_DB = "homecheff_film_cert_2u";

function isolatedDatabaseUrl(): string | null {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Certification database host is not local.");
  }
  if (name !== CERT_DB) throw new Error("Certification database name is not the disposable local database.");
  if (/neon|vercel|preview|prod/i.test(`${parsed.hostname}${name}`)) {
    throw new Error("Certification database URL looks remote.");
  }
  return url;
}

test("unified film pipeline on the disposable database", { timeout: 180_000 }, async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("FILM_CERT_DATABASE_URL is not configured");
    return;
  }
  process.env.DATABASE_URL = url;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = "test";
  process.env.ANIMATION_PROVIDER = "mock";
  process.env.STUDIO_VOICE_PROVIDER = "mock";
  process.env.STUDIO_SCENE_IMAGE_PROVIDER = "mock";
  process.env.STUDIO_SCENE_IMAGE_LOCAL_DIR = await mkdtemp(join(tmpdir(), "film-unified-images-"));
  process.env.STUDIO_LOCAL_MEDIA_DIR = await mkdtemp(join(tmpdir(), "film-unified-media-"));

  const { readFileSync } = await import("node:fs");
  const { prisma } = await import("@/lib/prisma");
  const timelineReady = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'StudioTimeline'
    ) AS "exists"
  `;
  if (!timelineReady[0]?.exists) {
    const sql = readFileSync(new URL("../../../prisma/migrations/20261020120000_studio_timeline/migration.sql", import.meta.url), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    const statements = sql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  }

  const { createOwnedFilmProject, createFilmScene, updateFilmScene } = await import("@/server/studio/studio-film-preparation");
  const { generateStudioSceneImage } = await import("@/server/studio/studio-scene-image-service");
  const { handoffSceneImageToVideo } = await import("@/server/studio/studio-scene-video-handoff");
  const { generateSceneDialogueAudio } = await import("@/server/studio/studio-scene-dialogue-audio");
  const { applyReverseStoryOrder, placeProjectMediaOnTimeline } = await import("@/server/studio/studio-film-timeline-arrange");
  const { addSubtitleLanguage, saveSubtitleCues } = await import("@/server/studio/studio-timeline-service");
  const { renderTimelineFilm } = await import("@/server/studio/studio-timeline-render");
  const { publishLibraryVideo } = await import("@/server/studio/publish-library-video");
  const { loadStudioProjectWorkspace } = await import("@/server/studio/load-studio-project-workspace");
  const { upsertLibraryAsset } = await import("@/server/studio-library/library-asset-service");
  const { resolveFfmpegForTextOverlay } = await import("@/lib/video-ffmpeg-capability");
  const { localPathIfAllowed } = await import("@/lib/studio-local-media");

  const user = await prisma.user.create({
    data: {
      email: `film-unified-${Date.now()}@example.test`,
      passwordHash: hashPassword("film-cert-local-only"),
      role: "user",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `film-unified-other-${Date.now()}@example.test`,
      passwordHash: hashPassword("film-cert-local-only"),
      role: "user",
    },
  });
  await prisma.studioWallet.create({
    data: { userId: user.id, balance: 40, promotionalBalance: 40, lifetimeGranted: 40 },
  });
  const viewer = { id: user.id, role: "user" as const };
  const created = await createOwnedFilmProject({
    ownerId: user.id,
    title: "MADE WITH PASSION technical mock",
    description: "Het begon met één klik.",
    idempotencyKey: `unified-${Date.now()}`,
  });
  assert.equal("error" in created, false);
  if ("error" in created) return;
  const projectId = created.projectId;
  const storyboardId = created.storyboardId;
  assert.ok(storyboardId);

  const firstScene = await createFilmScene(user.id, projectId, viewer, "Kitchen awake");
  const secondScene = await createFilmScene(user.id, projectId, viewer, "One click");
  assert.equal("error" in firstScene, false);
  assert.equal("error" in secondScene, false);
  if ("error" in firstScene || "error" in secondScene) return;

  const character = await prisma.studioCharacter.create({
    data: {
      ownerId: user.id,
      name: "Baker",
      slug: `baker-${Date.now()}`,
      role: "human",
      referenceImageUrl: "https://cert.local/masters/baker.png",
      referenceStorageKey: "local/baker",
      voiceProfile: "warm_narrator",
      voiceLanguage: "nl",
    },
  });
  await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId,
      family: "character",
      title: "Baker",
      sourceKind: "passion_character_master",
      sourceId: `master-${character.id}`,
      metadataJson: { characterId: character.id },
      previewUrl: character.referenceImageUrl,
    },
  });
  const assigned = await updateFilmScene(user.id, projectId, secondScene.scene.id, viewer, {
    characterIds: [character.id],
    dialogueText: "Het begon met één klik.",
  });
  assert.equal("error" in assigned, false);
  await updateFilmScene(user.id, projectId, firstScene.scene.id, viewer, {
    dialogueText: "The kitchen is awake.",
  });

  const imageA = await generateStudioSceneImage(storyboardId!, firstScene.scene.id, viewer);
  const imageB = await generateStudioSceneImage(storyboardId!, secondScene.scene.id, viewer);
  assert.equal("error" in imageA, false);
  assert.equal("error" in imageB, false);
  if ("error" in imageA || "error" in imageB) return;
  assert.equal(imageA.image.provider, "mock");
  assert.equal(imageB.image.provider, "mock");
  const stillBefore = imageB.image.imageUrl;

  process.env.ANIMATION_PROVIDER = "vidu";
  const blockedVideo = await handoffSceneImageToVideo({
    ownerId: user.id,
    projectId,
    sceneId: secondScene.scene.id,
    sceneImageId: imageB.image.id,
  });
  assert.equal("error" in blockedVideo, true);
  if (!("error" in blockedVideo)) return;
  assert.equal(blockedVideo.error.code, "paid_provider_disabled");
  process.env.ANIMATION_PROVIDER = "mock";

  const videoA = await handoffSceneImageToVideo({
    ownerId: user.id,
    projectId,
    sceneId: firstScene.scene.id,
    sceneImageId: imageA.image.id,
    forceProvider: "mock",
  });
  const videoB = await handoffSceneImageToVideo({
    ownerId: user.id,
    projectId,
    sceneId: secondScene.scene.id,
    sceneImageId: imageB.image.id,
    forceProvider: "mock",
  });
  assert.equal("error" in videoA, false);
  assert.equal("error" in videoB, false);
  if ("error" in videoA || "error" in videoB) return;
  assert.equal(videoA.created, true);
  assert.equal(videoA.creditsSpent, 0);
  const again = await handoffSceneImageToVideo({
    ownerId: user.id,
    projectId,
    sceneId: secondScene.scene.id,
    sceneImageId: imageB.image.id,
    forceProvider: "mock",
  });
  assert.equal("error" in again, false);
  if ("error" in again) return;
  assert.equal(again.created, false);
  assert.equal(again.assetId, videoB.assetId);
  const stillAfter = await prisma.studioSceneImage.findUniqueOrThrow({ where: { id: imageB.image.id } });
  assert.equal(stillAfter.imageUrl, stillBefore);
  const stolen = await handoffSceneImageToVideo({
    ownerId: other.id,
    projectId,
    sceneId: secondScene.scene.id,
    sceneImageId: imageB.image.id,
    forceProvider: "mock",
  });
  assert.equal("error" in stolen, true);

  const speechA = await generateSceneDialogueAudio({
    ownerId: user.id,
    projectId,
    sceneId: firstScene.scene.id,
    forceProvider: "mock",
    voiceProfile: "warm_narrator",
  });
  const speechB = await generateSceneDialogueAudio({
    ownerId: user.id,
    projectId,
    sceneId: secondScene.scene.id,
    forceProvider: "mock",
    voiceProfile: character.voiceProfile,
  });
  assert.equal("error" in speechA, false);
  assert.equal("error" in speechB, false);
  if ("error" in speechA || "error" in speechB) return;
  assert.equal(speechB.provider, "mock");
  const repeatedSpeech = await generateSceneDialogueAudio({
    ownerId: user.id,
    projectId,
    sceneId: secondScene.scene.id,
    forceProvider: "mock",
  });
  assert.equal("error" in repeatedSpeech, false);
  if ("error" in repeatedSpeech) return;
  assert.equal(repeatedSpeech.created, false);

  const ffmpeg = await resolveFfmpegForTextOverlay();
  const musicPath = join(process.env.STUDIO_LOCAL_MEDIA_DIR, "music.wav");
  await execFileAsync(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=196:sample_rate=44100:duration=10", "-ac", "2", musicPath]);
  const { pathToFileURL } = await import("node:url");
  const music = await upsertLibraryAsset({
    ownerId: user.id,
    projectId,
    family: "music",
    title: "Mock bed",
    sourceKind: "scene_music",
    sourceId: `${projectId}-bed`,
    previewUrl: pathToFileURL(musicPath).href,
    downloadUrl: pathToFileURL(musicPath).href,
    storageKey: musicPath,
    mimeType: "audio/wav",
    durationSeconds: 10,
    creditsSpent: 0,
  });

  const placed = await placeProjectMediaOnTimeline({
    ownerId: user.id,
    projectId,
    videoAssetIdsInStoryOrder: [videoA.assetId, videoB.assetId],
    dialogueAssetIdsInStoryOrder: [speechA.assetId, speechB.assetId],
    musicAssetId: music.id,
  });
  assert.equal("error" in placed, false);
  if ("error" in placed || !placed.timeline) return;
  const storyOrder = placed.timeline.tracks
    .find((track) => track.type === "VIDEO")
    ?.clips.slice()
    .sort((left, right) => left.startMs - right.startMs)
    .map((clip) => clip.sourceId);
  assert.deepEqual(storyOrder, [videoA.assetId, videoB.assetId]);

  const reversed = await applyReverseStoryOrder(user.id, projectId);
  assert.equal("error" in reversed, false);
  if ("error" in reversed || !reversed.timeline) return;
  const picture = reversed.timeline.tracks
    .find((track) => track.type === "VIDEO")
    ?.clips.slice()
    .sort((left, right) => left.startMs - right.startMs);
  assert.ok(picture && picture.length === 2);
  assert.equal(picture[0]?.sourceId, videoB.assetId);
  assert.equal(picture[1]?.sourceId, videoA.assetId);
  assert.equal(picture[0]?.startMs, 0);
  assert.equal(picture[1]?.startMs, picture[0]?.durationMs);

  const language = await addSubtitleLanguage(user.id, projectId, reversed.timeline.revision, "nl");
  assert.equal("error" in language, false);
  if ("error" in language || !language.timeline) return;
  const savedCues = await saveSubtitleCues({
    ownerId: user.id,
    projectId,
    revision: language.timeline.revision,
    language: "nl",
    status: "ready",
    cues: [
      { text: "Het begon met één klik.", startMs: 200, endMs: Math.max(800, (picture[0]?.durationMs ?? 1000) - 200), sceneId: secondScene.scene.id },
    ],
  });
  assert.equal("error" in savedCues, false);

  const wallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(wallet.balance, 40);
  assert.equal(wallet.reservedBalance, 0);
  const projectRow = await prisma.studioCreativeProject.findUniqueOrThrow({ where: { id: projectId } });
  assert.equal(projectRow.title, "MADE WITH PASSION technical mock");

  const outputPath = join(process.env.STUDIO_LOCAL_MEDIA_DIR, "final.mp4");
  const rendered = await renderTimelineFilm({
    workDir: join(process.env.STUDIO_LOCAL_MEDIA_DIR, "render"),
    outputPath,
    width: 720,
    height: 1280,
    visuals: (picture ?? []).map((clip) => ({
      path: localPathIfAllowed(clip.playbackUrl ?? "") ?? "",
      kind: "video" as const,
      startMs: clip.startMs,
      durationMs: clip.durationMs,
      inMs: 0,
    })),
    audio: reversed.timeline.tracks
      .filter((track) => track.type === "DIALOGUE" || track.type === "MUSIC")
      .flatMap((track) =>
        track.clips.map((clip) => ({
          track: track.type as "DIALOGUE" | "MUSIC",
          path: localPathIfAllowed(clip.playbackUrl ?? "") ?? "",
          startMs: clip.startMs,
          durationMs: clip.durationMs,
          inMs: 0,
          volume: track.type === "MUSIC" ? 35 : 100,
        })),
      ),
    cues: [{ text: "Het begon met één klik.", startMs: 200, endMs: 1200, sceneId: secondScene.scene.id }],
    burnSubtitles: true,
  });
  assert.equal(rendered.ok, true, rendered.ok ? "" : rendered.message);
  if (!rendered.ok) return;
  const expectedMs = (picture ?? []).reduce((sum, clip) => sum + clip.durationMs, 0);
  assert.equal(rendered.durationMs, expectedMs);

  const probeBin = ffmpeg.replace(/ffmpeg$/, "ffprobe");
  const probed = await execFileAsync(probeBin, [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,codec_name,width,height",
    "-of",
    "json",
    outputPath,
  ]).catch(async () =>
    execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height",
      "-of",
      "json",
      outputPath,
    ]),
  );
  const info = JSON.parse(probed.stdout) as {
    streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
    format?: { duration?: string };
  };
  const videoStream = info.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = info.streams?.find((stream) => stream.codec_type === "audio");
  assert.equal(videoStream?.codec_name, "h264");
  assert.equal(videoStream?.width, 720);
  assert.equal(videoStream?.height, 1280);
  assert.equal(audioStream?.codec_name, "aac");
  const durationSeconds = Number(info.format?.duration ?? "0");
  assert.ok(Math.abs(durationSeconds * 1000 - expectedMs) < 400, `duration ${durationSeconds}`);
  const header = await readFile(outputPath);
  assert.ok(header.includes(Buffer.from("ftyp")));

  const published = await publishLibraryVideo({
    ownerId: user.id,
    sourceKind: "timeline_export",
    sourceId: `${projectId}:final`,
    title: projectRow.title,
    description: "Technical mock. Original scenes were not replaced.",
    bytes: header,
    projectId,
    durationSeconds,
    width: 720,
    height: 1280,
    language: "nl",
    metadata: { technicalMock: true },
  });
  assert.equal(published.created, true);
  const reopened = await loadStudioProjectWorkspace(user.id, projectId);
  assert.ok(reopened);
  assert.equal(reopened?.project.title, "MADE WITH PASSION technical mock");
  assert.equal(reopened?.scenes.length, 2);
  const libraryFilm = reopened?.exports.find((item) => item.id === published.assetId);
  assert.ok(libraryFilm?.downloadUrl);
  assert.match(libraryFilm?.downloadUrl ?? "", /\/library\/.+\/file$/);
  const mediaVideo = reopened?.media.find((item) => item.id === videoB.assetId);
  assert.equal(mediaVideo?.family, "video");
  assert.equal(await loadStudioProjectWorkspace(other.id, projectId), null);

  const finalWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(finalWallet.balance, 40);
  assert.equal(finalWallet.reservedBalance, 0);
  assert.equal(await prisma.studioLedgerEntry.count({ where: { userId: user.id } }), 0);
});
