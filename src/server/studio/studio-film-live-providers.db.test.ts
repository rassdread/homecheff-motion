/**
 * Disposable local certification for billed film video and dialogue.
 * The providers are injected mocks. This file refuses every remote database.
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

test("billed film providers capture and refund test credits without a live call", { timeout: 180_000 }, async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("FILM_CERT_DATABASE_URL is not configured");
    return;
  }
  process.env.DATABASE_URL = url;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.VIDU_API_KEY;
  delete process.env.VIDU_ENABLE_REAL_CALLS;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = "test";
  process.env.ANIMATION_PROVIDER = "mock";
  process.env.STUDIO_VOICE_PROVIDER = "mock";
  process.env.STUDIO_SCENE_IMAGE_PROVIDER = "mock";
  process.env.STUDIO_SCENE_IMAGE_LOCAL_DIR = await mkdtemp(join(tmpdir(), "film-live-images-"));
  process.env.STUDIO_LOCAL_MEDIA_DIR = await mkdtemp(join(tmpdir(), "film-live-media-"));

  const { prisma } = await import("@/lib/prisma");
  const { ensureStudioAccount } = await import("@/server/studio-account/ensure-studio-account");
  const { createOwnedFilmProject, createFilmScene, updateFilmScene } = await import("@/server/studio/studio-film-preparation");
  const { generateStudioSceneImage } = await import("@/server/studio/studio-scene-image-service");
  const {
    completeFilmSceneVideo,
    quoteFilmSceneDialogue,
    quoteFilmSceneVideo,
    startFilmSceneDialogue,
    startFilmSceneVideo,
  } = await import("@/server/studio/studio-film-live-generation");
  const { applyReverseStoryOrder } = await import("@/server/studio/studio-film-timeline-arrange");
  const { addTimelineClip, getFilmTimeline, setTimelineTrack } = await import("@/server/studio/studio-timeline-service");
  const { renderTimelineFilm } = await import("@/server/studio/studio-timeline-render");
  const { publishLibraryVideo } = await import("@/server/studio/publish-library-video");
  const { loadStudioProjectWorkspace } = await import("@/server/studio/load-studio-project-workspace");
  const { upsertLibraryAsset } = await import("@/server/studio-library/library-asset-service");
  const { resolveFfmpegForTextOverlay } = await import("@/lib/video-ffmpeg-capability");
  const { localPathIfAllowed } = await import("@/lib/studio-local-media");
  const { selectVoiceProvider } = await import("@/server/studio/voice/voice-provider");

  const stamp = Date.now();
  const user = await prisma.user.create({
    data: { email: `film-live-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  const other = await prisma.user.create({
    data: { email: `film-live-other-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  const poor = await prisma.user.create({
    data: { email: `film-live-poor-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  const viewer = { id: user.id, email: user.email, role: "user" as const };
  await ensureStudioAccount(user.id, user.email);
  await ensureStudioAccount(poor.id, poor.email);
  await prisma.studioWallet.update({
    where: { userId: user.id },
    data: { balance: 2000, promotionalBalance: 2000, purchasedBalance: 0, reservedBalance: 0 },
  });
  await prisma.studioWallet.update({
    where: { userId: poor.id },
    data: { balance: 0, promotionalBalance: 0, purchasedBalance: 0, reservedBalance: 0 },
  });

  const created = await createOwnedFilmProject({
    ownerId: user.id,
    title: "Provider certification film",
    description: "Mock providers only.",
    idempotencyKey: `live-cert-${stamp}`,
  });
  assert.equal("error" in created, false);
  if ("error" in created) return;
  const poorFilm = await createOwnedFilmProject({
    ownerId: poor.id,
    title: "No credits",
    description: "Must not call a provider.",
    idempotencyKey: `live-poor-${stamp}`,
  });
  assert.equal("error" in poorFilm, false);
  if ("error" in poorFilm || !created.storyboardId || !poorFilm.storyboardId) return;

  const first = await createFilmScene(user.id, created.projectId, viewer, "Opening");
  const second = await createFilmScene(user.id, created.projectId, viewer, "Turn");
  const bare = await createFilmScene(user.id, created.projectId, viewer, "No still");
  const poorScene = await createFilmScene(poor.id, poorFilm.projectId, { id: poor.id, role: "user" }, "Blocked");
  assert.equal("error" in first, false);
  assert.equal("error" in second, false);
  assert.equal("error" in bare, false);
  assert.equal("error" in poorScene, false);
  if ("error" in first || "error" in second || "error" in bare || "error" in poorScene) return;

  const character = await prisma.studioCharacter.create({
    data: {
      ownerId: user.id,
      name: "Baker",
      slug: `baker-live-${stamp}`,
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
      projectId: created.projectId,
      family: "character",
      title: "Baker",
      sourceKind: "passion_character_master",
      sourceId: `master-${character.id}`,
      metadataJson: { characterId: character.id },
      previewUrl: character.referenceImageUrl,
    },
  });
  const assigned = await updateFilmScene(user.id, created.projectId, first.scene.id, viewer, {
    characterIds: [character.id],
    dialogueText: "Het begon met één klik.",
  });
  const secondLine = await updateFilmScene(user.id, created.projectId, second.scene.id, viewer, {
    dialogueText: "FAIL the second line.",
  });
  assert.equal("error" in assigned, false);
  assert.equal("error" in secondLine, false);
  const imageA = await generateStudioSceneImage(created.storyboardId, first.scene.id, viewer);
  const imageB = await generateStudioSceneImage(created.storyboardId, second.scene.id, viewer);
  const poorImage = await generateStudioSceneImage(poorFilm.storyboardId, poorScene.scene.id, { id: poor.id, role: "user" });
  assert.equal("error" in imageA, false);
  assert.equal("error" in imageB, false);
  assert.equal("error" in poorImage, false);
  if ("error" in imageA || "error" in imageB || "error" in poorImage) return;

  const ffmpeg = await resolveFfmpegForTextOverlay();
  const videoPath = join(process.env.STUDIO_LOCAL_MEDIA_DIR, "scene-source.mp4");
  await execFileAsync(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x1D4E89:s=360x640:r=25:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", videoPath]);
  let videoCalls = 0;
  const videoDriver = {
    async createJob() {
      videoCalls += 1;
      if (videoCalls === 1) {
        return { providerJobId: "cert-video-open", status: "completed" as const, output: { filePath: videoPath, mimeType: "video/mp4", durationSeconds: 2 } };
      }
      return { providerJobId: "cert-video-pending", status: "queued" as const };
    },
    async readJob(providerJobId: string) {
      if (providerJobId === "cert-video-timeout") throw new Error("timeout");
      if (providerJobId === "cert-video-failed") return { status: "failed" as const, errorMessage: "mock vidu failed" };
      return { status: "completed" as const, output: { filePath: videoPath, mimeType: "video/mp4", durationSeconds: 2 } };
    },
  };
  const pendingDriver = {
    async createJob() {
      videoCalls += 1;
      return { providerJobId: "cert-video-pending", status: "queued" as const };
    },
    async readJob() {
      if (videoDriverRead === "timeout") throw new Error("timeout");
      if (videoDriverRead === "failed") return { status: "failed" as const, errorMessage: "mock vidu failed" };
      return { status: "completed" as const, output: { filePath: videoPath, mimeType: "video/mp4", durationSeconds: 2 } };
    },
  };
  let videoDriverRead: "timeout" | "failed" | "done" = "timeout";
  const voice = selectVoiceProvider("mock");
  let voiceCalls = 0;
  const voiceDriver = {
    id: "mock" as const,
    async synthesize(request: Parameters<typeof voice.synthesize>[0]) {
      voiceCalls += 1;
      if (request.request.text.includes("FAIL")) throw new Error("mock elevenlabs failed");
      return voice.synthesize(request);
    },
  };

  const quote = await quoteFilmSceneVideo({ user: viewer, projectId: created.projectId, sceneId: first.scene.id, sceneImageId: imageA.image.id });
  assert.equal("error" in quote, false);
  if ("error" in quote) return;
  assert.equal(quote.requiredCredits > 0, true);
  const videoCredits = quote.requiredCredits;
  assert.equal(quote.provider, "vidu");
  assert.equal(quote.characterIdentityLock, false);
  assert.equal(quote.endFrame, "same_scene_still");
  assert.equal(videoCalls, 0);

  const unconfirmed = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    sceneImageId: imageA.image.id,
    clientRequestId: "video-open",
    confirmed: false,
    endImagePolicy: "same_scene_still",
    videoDriver,
  });
  assert.equal("error" in unconfirmed && unconfirmed.error.code, "confirmation_required");
  const missingEnd = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    sceneImageId: imageA.image.id,
    clientRequestId: "video-open",
    confirmed: true,
    videoDriver,
  });
  assert.equal("error" in missingEnd && missingEnd.error.code, "end_frame_required");
  const closed = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    sceneImageId: imageA.image.id,
    clientRequestId: "video-open",
    confirmed: true,
    endImagePolicy: "same_scene_still",
  });
  assert.equal("error" in closed && closed.error.code, "paid_provider_disabled");
  const stolen = await startFilmSceneVideo({
    user: { id: other.id, email: other.email, role: "user" },
    projectId: created.projectId,
    sceneId: first.scene.id,
    sceneImageId: imageA.image.id,
    clientRequestId: "video-open",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    videoDriver,
  });
  assert.equal("error" in stolen && stolen.error.code, "not_found");
  const noStill = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: bare.scene.id,
    clientRequestId: "video-bare",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    videoDriver,
  });
  assert.equal("error" in noStill && noStill.error.code, "missing_reference_image");
  const blocked = await startFilmSceneVideo({
    user: { id: poor.id, email: poor.email, role: "user" },
    projectId: poorFilm.projectId,
    sceneId: poorScene.scene.id,
    sceneImageId: poorImage.image.id,
    clientRequestId: "video-poor",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    videoDriver,
  });
  assert.equal("error" in blocked, true);
  if (!("error" in blocked)) return;
  assert.equal(blocked.error.code === "insufficient_credits" || blocked.error.code === "free_account_provider_action", true);
  assert.equal(videoCalls, 0);

  const opened = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    sceneImageId: imageA.image.id,
    clientRequestId: "video-open",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    attachToTimeline: true,
    videoDriver,
  });
  assert.equal("error" in opened, false);
  if ("error" in opened) return;
  assert.equal(opened.status, "succeeded");
  assert.equal(opened.creditsCaptured, videoCredits);
  assert.equal(videoCalls, 1);
  const replay = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    sceneImageId: imageA.image.id,
    clientRequestId: "video-open",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    videoDriver,
  });
  assert.equal("error" in replay, false);
  if ("error" in replay) return;
  assert.equal(replay.created, false);
  assert.equal(replay.creditsCaptured, 0);
  assert.equal(videoCalls, 1);
  const again = await completeFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    jobId: opened.jobId,
    videoDriver,
  });
  assert.equal("error" in again, false);
  if ("error" in again) return;
  assert.equal(again.status, "replay");
  assert.equal(again.creditsCaptured, 0);

  const pending = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: second.scene.id,
    sceneImageId: imageB.image.id,
    clientRequestId: "video-pending",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    videoDriver: pendingDriver,
  });
  assert.equal("error" in pending, false);
  if ("error" in pending) return;
  assert.equal(pending.status, "pending");
  assert.equal(pending.creditsReserved, videoCredits);
  const held = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(held.reservedBalance, videoCredits);
  const timedOut = await completeFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    jobId: pending.jobId,
    videoDriver: { ...pendingDriver, async readJob() { throw new Error("timeout"); } },
  });
  assert.equal("error" in timedOut && timedOut.error.code, "provider_timeout");
  const stillHeld = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(stillHeld.reservedBalance, videoCredits);
  videoDriverRead = "failed";
  const failedVideo = await completeFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    jobId: pending.jobId,
    videoDriver: pendingDriver,
  });
  assert.equal("error" in failedVideo && failedVideo.error.code, "provider_failed");
  const refunded = await completeFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    jobId: pending.jobId,
    videoDriver: pendingDriver,
  });
  assert.equal("error" in refunded && refunded.error.code, "provider_failed");
  const afterRefund = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(afterRefund.balance, 2000 - videoCredits);
  assert.equal(afterRefund.reservedBalance, 0);

  videoDriverRead = "done";
  const secondVideo = await startFilmSceneVideo({
    user: viewer,
    projectId: created.projectId,
    sceneId: second.scene.id,
    sceneImageId: imageB.image.id,
    clientRequestId: "video-turn",
    confirmed: true,
    endImagePolicy: "same_scene_still",
    attachToTimeline: true,
    videoDriver: {
      async createJob() {
        videoCalls += 1;
        return { providerJobId: "cert-video-turn", status: "completed" as const, output: { filePath: videoPath, mimeType: "video/mp4", durationSeconds: 2 } };
      },
      async readJob() {
        return { status: "completed" as const, output: { filePath: videoPath, mimeType: "video/mp4", durationSeconds: 2 } };
      },
    },
  });
  assert.equal("error" in secondVideo, false);
  if ("error" in secondVideo) return;
  assert.equal(secondVideo.creditsCaptured, videoCredits);

  const speechQuote = await quoteFilmSceneDialogue({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    characterId: character.id,
  });
  assert.equal("error" in speechQuote, false);
  if ("error" in speechQuote) return;
  assert.equal(speechQuote.requiredCredits > 0, true);
  const speechCredits = speechQuote.requiredCredits;
  assert.equal(speechQuote.voiceProfile, "warm_narrator");
  const badVoice = await startFilmSceneDialogue({
    user: viewer,
    projectId: created.projectId,
    sceneId: second.scene.id,
    voiceProfile: "not-a-studio-voice",
    clientRequestId: "speech-bad",
    confirmed: true,
    voiceDriver,
  });
  assert.equal("error" in badVoice && badVoice.error.code, "voice_unavailable");
  assert.equal(voiceCalls, 0);
  const speech = await startFilmSceneDialogue({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    characterId: character.id,
    clientRequestId: "speech-open",
    confirmed: true,
    attachToTimeline: true,
    voiceDriver,
  });
  assert.equal("error" in speech, false);
  if ("error" in speech) return;
  assert.equal(speech.creditsCaptured, speechCredits);
  assert.equal(voiceCalls, 1);
  const speechReplay = await startFilmSceneDialogue({
    user: viewer,
    projectId: created.projectId,
    sceneId: first.scene.id,
    characterId: character.id,
    clientRequestId: "speech-open",
    confirmed: true,
    voiceDriver,
  });
  assert.equal("error" in speechReplay, false);
  if ("error" in speechReplay) return;
  assert.equal(speechReplay.created, false);
  assert.equal(voiceCalls, 1);
  const failedSpeech = await startFilmSceneDialogue({
    user: viewer,
    projectId: created.projectId,
    sceneId: second.scene.id,
    voiceProfile: "warm_narrator",
    clientRequestId: "speech-fail",
    confirmed: true,
    voiceDriver,
  });
  assert.equal("error" in failedSpeech && failedSpeech.error.code, "provider_failed");
  const failedSpeechAgain = await startFilmSceneDialogue({
    user: viewer,
    projectId: created.projectId,
    sceneId: second.scene.id,
    voiceProfile: "warm_narrator",
    clientRequestId: "speech-fail",
    confirmed: true,
    voiceDriver,
  });
  assert.equal("error" in failedSpeechAgain && failedSpeechAgain.error.code, "provider_failed");
  assert.equal(voiceCalls, 2);

  const wallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(wallet.balance, 2000 - videoCredits * 2 - speechCredits);
  assert.equal(wallet.reservedBalance, 0);
  const captures = await prisma.studioLedgerEntry.count({ where: { userId: user.id, actionType: "usage_capture" } });
  const refunds = await prisma.studioLedgerEntry.count({ where: { userId: user.id, actionType: "failed_generation_refund" } });
  assert.equal(captures, 3);
  assert.equal(refunds, 2);
  const poorWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: poor.id } });
  assert.equal(poorWallet.balance, 0);

  const musicPath = join(process.env.STUDIO_LOCAL_MEDIA_DIR, "music.wav");
  await execFileAsync(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=196:sample_rate=44100:duration=6", "-ac", "2", musicPath]);
  const { pathToFileURL } = await import("node:url");
  const music = await upsertLibraryAsset({
    ownerId: user.id,
    projectId: created.projectId,
    family: "music",
    title: "Mock bed",
    sourceKind: "scene_music",
    sourceId: `${created.projectId}-bed`,
    previewUrl: pathToFileURL(musicPath).href,
    downloadUrl: pathToFileURL(musicPath).href,
    storageKey: musicPath,
    mimeType: "audio/wav",
    durationSeconds: 6,
    creditsSpent: 0,
  });
  const current = await getFilmTimeline(user.id, created.projectId);
  assert.equal("error" in current, false);
  if ("error" in current || !current.timeline) return;
  const musicTrack = current.timeline.tracks.find((track) => track.type === "MUSIC");
  assert.ok(musicTrack);
  const withMusic = await addTimelineClip({
    ownerId: user.id,
    projectId: created.projectId,
    revision: current.timeline.revision,
    trackId: musicTrack!.id,
    sourceKind: "library_asset",
    sourceId: music.id,
    startMs: 0,
    clientRequestId: `music-${music.id}`,
  });
  assert.equal("error" in withMusic, false);
  if ("error" in withMusic || !withMusic.timeline) return;
  const mixed = await setTimelineTrack({
    ownerId: user.id,
    projectId: created.projectId,
    revision: withMusic.timeline.revision,
    trackId: musicTrack!.id,
    volume: 35,
  });
  assert.equal("error" in mixed, false);
  const reversed = await applyReverseStoryOrder(user.id, created.projectId);
  assert.equal("error" in reversed, false);
  if ("error" in reversed || !reversed.timeline) return;
  const picture = reversed.timeline.tracks.find((track) => track.type === "VIDEO")?.clips.slice().sort((left, right) => left.startMs - right.startMs);
  assert.equal(picture?.[0]?.sourceId, secondVideo.assetId);
  assert.equal(picture?.[1]?.sourceId, opened.assetId);
  assert.equal(reversed.timeline.tracks.find((track) => track.type === "MUSIC")?.volume, 35);
  const reopened = await getFilmTimeline(user.id, created.projectId);
  assert.equal("error" in reopened, false);
  if ("error" in reopened || !reopened.timeline) return;
  assert.equal(reopened.timeline.tracks.find((track) => track.type === "VIDEO")?.clips.length, 2);

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
          volume: track.volume,
        })),
      ),
    cues: [],
    burnSubtitles: false,
  });
  assert.equal(rendered.ok, true, rendered.ok ? "" : rendered.message);
  if (!rendered.ok) return;
  const header = await readFile(outputPath);
  assert.ok(header.includes(Buffer.from("ftyp")));
  const published = await publishLibraryVideo({
    ownerId: user.id,
    sourceKind: "timeline_export",
    sourceId: `${created.projectId}:provider-cert`,
    title: "Provider certification film",
    description: "Mock providers only.",
    bytes: header,
    projectId: created.projectId,
    durationSeconds: rendered.durationMs / 1000,
    width: 720,
    height: 1280,
    metadata: { technicalMock: true },
  });
  const workspace = await loadStudioProjectWorkspace(user.id, created.projectId);
  assert.equal(workspace?.exports.some((item) => item.id === published.assetId), true);
  assert.equal(await loadStudioProjectWorkspace(other.id, created.projectId), null);
});
