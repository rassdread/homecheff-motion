/**
 * Connects a film scene to the existing Vidu and ElevenLabs services.
 * Live calls stay behind the existing provider gates.
 * A certified mock driver is accepted only by this module's callers in tests.
 * The public routes do not pass one, and the free mock handoff does not capture credits.
 */

import { execFile } from "node:child_process";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { buildVoiceRequest, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import { prisma } from "@/lib/prisma";
import { localMediaDir, safeLocalFileName } from "@/lib/studio-local-media";
import { getVoiceProfilePreset, isStudioVoiceProfileId } from "@/lib/studio-voice-profiles";
import { isBlobTokenConfigured, uploadPublicBlob } from "@/lib/vercel-blob-config";
import { resolveFfmpegForTextOverlay } from "@/lib/video-ffmpeg-capability";
import type { SessionUser } from "@/server/auth/session";
import {
  authorizeStudioAction,
  captureStudioActionReservation,
  previewStudioCreditAuthorization,
  refundStudioActionReservation,
  type CreditReservation,
} from "@/server/studio-account/studio-credit-authorization";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";
import { createGenerationJob } from "@/server/studio-generation/generation-orchestrator";
import {
  finalizeGenerationChargeOnce,
  getGenerationJobForOwner,
  updateGenerationJobStatus,
  type StudioGenerationJobRow,
} from "@/server/studio-generation/generation-job-service";
import type { StudioGenerationProviderAdapter } from "@/server/studio-generation/provider-adapter";
import { addTimelineClip, createFilmTimeline } from "@/server/studio/studio-timeline-service";
import { selectVoiceProvider, type VoiceProvider } from "@/server/studio/voice/voice-provider";
import { getSelectedAnimationProviderId, getVideoProvider } from "@/server/video-providers";
import { isViduRealCallsEnabled, resolveViduDurationSecondsForJob, resolveViduResolution } from "@/server/video-providers/vidu-config";
import type { CreateStartEndVideoJobInput, VideoJobLifecycleStatus } from "@/server/video-providers/types";

const execFileAsync = promisify(execFile);

const certifiedMockAdapter: StudioGenerationProviderAdapter = {
  id: "certified_mock",
  supportsAsync: true,
  supportsCancellation: false,
  async start() {
    return { providerJobId: "" };
  },
  async getStatus() {
    return { providerStatus: "certified_mock", studioStatus: "generating" };
  },
  async getResult() {
    return {};
  },
};

type Viewer = Pick<SessionUser, "id" | "email" | "role">;
type Failure = { error: { code: string; message: string; httpStatus: number } };

export type FilmMediaOutput = {
  filePath?: string;
  bytes?: Buffer;
  mimeType?: string;
  durationSeconds?: number;
  remoteUrl?: string;
};

export type FilmVideoDriver = {
  createJob(input: CreateStartEndVideoJobInput): Promise<{
    providerJobId: string;
    status: VideoJobLifecycleStatus;
    errorMessage?: string;
    output?: FilmMediaOutput;
  }>;
  readJob(providerJobId: string): Promise<{
    status: VideoJobLifecycleStatus;
    errorMessage?: string;
    output?: FilmMediaOutput;
  }>;
};

type StoredReservation = CreditReservation;

function fail(code: string, message: string, httpStatus: number): Failure {
  return { error: { code, message, httpStatus } };
}

export function filmVideoLiveEnabled(): boolean {
  return getSelectedAnimationProviderId() === "vidu" && isViduRealCallsEnabled();
}

export function filmVoiceLiveEnabled(): boolean {
  return process.env.STUDIO_VOICE_PROVIDER === "elevenlabs" && Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

function reservationFrom(job: StudioGenerationJobRow): StoredReservation | null {
  const meta = job.metadataJson;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const row = meta as Record<string, unknown>;
  const reservation = row.reservation;
  if (!reservation || typeof reservation !== "object" || Array.isArray(reservation)) return null;
  const value = reservation as Record<string, unknown>;
  if (typeof value.reservationId !== "string" || typeof value.requiredCredits !== "number") return null;
  return {
    reservationId: value.reservationId,
    requiredCredits: value.requiredCredits,
    service: typeof value.service === "string" ? value.service : "",
    provider: typeof value.provider === "string" ? value.provider : "",
    reservedCostUsd: typeof value.reservedCostUsd === "number" ? value.reservedCostUsd : 0,
    marginEstimate: typeof value.marginEstimate === "number" ? value.marginEstimate : 0,
  };
}

function existingDriver(kind: "video" | "voice"): FilmVideoDriver | VoiceProvider | null {
  if (kind === "video") {
    if (!filmVideoLiveEnabled()) return null;
    const provider = getVideoProvider();
    return {
      async createJob(input) {
        const created = await provider.createStartEndVideoJob(input);
        return { providerJobId: created.providerJobId, status: created.status };
      },
      async readJob(providerJobId) {
        const status = await provider.getVideoJobStatus(providerJobId);
        return {
          status: status.status,
          errorMessage: status.errorMessage,
          output: status.outputVideoUrl
            ? { remoteUrl: status.outputVideoUrl, durationSeconds: status.providerDurationSeconds }
            : undefined,
        };
      },
    };
  }
  if (!filmVoiceLiveEnabled()) return null;
  const provider = selectVoiceProvider();
  return provider.id === "elevenlabs" ? provider : null;
}

async function loadOwnedScene(ownerId: string, projectId: string, sceneId: string) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true, storyboardId: true, title: true },
  });
  if (!project?.storyboardId) return null;
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId: project.storyboardId, storyboard: { ownerId } },
    select: {
      id: true,
      title: true,
      description: true,
      dialogueText: true,
      durationSeconds: true,
      order: true,
      selectedSceneImageId: true,
      characters: {
        select: {
          character: {
            select: { id: true, name: true, voiceProfile: true, voiceLanguage: true, referenceImageUrl: true },
          },
        },
      },
    },
  });
  if (!scene) return null;
  return { project, scene };
}

export async function quoteFilmSceneVideo(input: {
  user: Viewer;
  projectId: string;
  sceneId: string;
  sceneImageId?: string;
}): Promise<
  | {
      actionType: "motion_render";
      requiredCredits: number;
      allowed: boolean;
      reason: string | null;
      confirmationRequired: boolean;
      durationSeconds: number;
      resolution: string;
      endFrame: "same_scene_still";
      characterIdentityLock: false;
      provider: "vidu";
    }
  | Failure
> {
  const owned = await loadOwnedScene(input.user.id, input.projectId, input.sceneId);
  if (!owned) return fail("not_found", "Film scene not found.", 404);
  const imageId = input.sceneImageId?.trim() || owned.scene.selectedSceneImageId || "";
  const image = imageId
    ? await prisma.studioSceneImage.findFirst({
        where: { id: imageId, sceneId: owned.scene.id, status: "completed" },
        select: { id: true, imageUrl: true },
      })
    : null;
  if (!image?.imageUrl.trim()) return fail("missing_reference_image", "This scene has no selected reference image.", 400);
  let durationSeconds = owned.scene.durationSeconds;
  try {
    durationSeconds = resolveViduDurationSecondsForJob(owned.scene.durationSeconds);
  } catch {
    return fail("duration_unsupported", "This scene duration is outside the existing Vidu range of 1 to 16 seconds.", 400);
  }
  let resolution = "720p";
  try {
    resolution = resolveViduResolution();
  } catch {
    return fail("configuration_invalid", "The existing Vidu resolution setting is not valid.", 500);
  }
  const preview = await previewStudioCreditAuthorization({
    user: input.user,
    actionType: "motion_render",
    projectId: input.projectId,
  });
  return {
    actionType: "motion_render",
    requiredCredits: preview.requiredCredits,
    allowed: preview.allowed,
    reason: preview.reason,
    confirmationRequired: true,
    durationSeconds,
    resolution,
    endFrame: "same_scene_still",
    characterIdentityLock: false,
    provider: "vidu",
  };
}

async function storeMedia(input: {
  ownerId: string;
  sceneId: string;
  kind: "video" | "voice";
  output: FilmMediaOutput;
}): Promise<{ url: string; storageKey: string; backingStore: string; mimeType: string } | Failure> {
  const mimeType = input.output.mimeType || (input.kind === "video" ? "video/mp4" : "audio/wav");
  const extension = input.kind === "video" ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "wav";
  if (input.output.filePath) {
    const dir = localMediaDir();
    if (!dir) return fail("media_storage_unavailable", "Local media storage is not configured.", 500);
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, `${input.kind}-${safeLocalFileName(input.sceneId)}.${extension}`);
    if (path.resolve(input.output.filePath) !== path.resolve(target)) {
      await copyFile(input.output.filePath, target);
    }
    return { url: pathToFileURL(target).href, storageKey: target, backingStore: "local_file", mimeType };
  }
  if (input.output.bytes && localMediaDir()) {
    const dir = localMediaDir()!;
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, `${input.kind}-${safeLocalFileName(input.sceneId)}.${extension}`);
    if (input.kind === "voice" && !mimeType.includes("mpeg")) {
      const rawPath = `${target}.raw.wav`;
      await writeFile(rawPath, input.output.bytes);
      const ffmpeg = await resolveFfmpegForTextOverlay();
      await execFileAsync(ffmpeg, ["-y", "-i", rawPath, "-ar", "44100", "-ac", "2", target]);
      await rm(rawPath, { force: true });
    } else {
      await writeFile(target, input.output.bytes);
    }
    return { url: pathToFileURL(target).href, storageKey: target, backingStore: "local_file", mimeType };
  }
  if (input.output.bytes && isBlobTokenConfigured()) {
    const uploaded = await uploadPublicBlob({
      pathname: `studio/films/${input.ownerId}/${input.kind}-${safeLocalFileName(input.sceneId)}.${extension}`,
      body: input.output.bytes,
      contentType: mimeType,
      context: { projectId: input.sceneId, uploadTarget: "library", provider: input.kind },
    });
    return { url: uploaded.url, storageKey: uploaded.pathname, backingStore: "vercel_blob", mimeType };
  }
  if (input.output.remoteUrl && isBlobTokenConfigured()) {
    const response = await fetch(input.output.remoteUrl);
    if (!response.ok) return fail("media_storage_unavailable", "The generated file could not be stored.", 502);
    const bytes = Buffer.from(await response.arrayBuffer());
    const uploaded = await uploadPublicBlob({
      pathname: `studio/films/${input.ownerId}/${input.kind}-${safeLocalFileName(input.sceneId)}.${extension}`,
      body: bytes,
      contentType: mimeType,
      context: { projectId: input.sceneId, uploadTarget: "library", provider: input.kind },
    });
    return { url: uploaded.url, storageKey: uploaded.pathname, backingStore: "vercel_blob", mimeType };
  }
  return fail("media_storage_unavailable", "Generated media has no existing storage destination.", 500);
}

async function attachAsset(input: {
  ownerId: string;
  projectId: string;
  assetId: string;
  trackType: "VIDEO" | "DIALOGUE";
}) {
  const created = await createFilmTimeline(input.ownerId, input.projectId);
  if ("error" in created || !created.timeline) return created;
  const track = created.timeline.tracks.find((item) => item.type === input.trackType);
  if (!track) return fail("track_type", "The timeline is missing a track.", 500);
  const already = track.clips.some((clip) => clip.sourceId === input.assetId);
  if (already) return created;
  const startMs = track.clips.reduce((end, clip) => Math.max(end, clip.startMs + clip.durationMs), 0);
  return addTimelineClip({
    ownerId: input.ownerId,
    projectId: input.projectId,
    revision: created.timeline.revision,
    trackId: track.id,
    sourceKind: "library_asset",
    sourceId: input.assetId,
    startMs,
    clientRequestId: `generated-${input.assetId}`,
  });
}

async function releaseReservation(userId: string, projectId: string, reservation: StoredReservation | null) {
  if (!reservation || reservation.requiredCredits <= 0 || reservation.reservationId === "admin-bypass") return;
  await refundStudioActionReservation({
    userId,
    reservation,
    projectId,
    failedGeneration: true,
  });
}

export async function startFilmSceneVideo(input: {
  user: Viewer;
  projectId: string;
  sceneId: string;
  sceneImageId?: string;
  clientRequestId: string;
  confirmed: boolean;
  endImagePolicy?: string;
  attachToTimeline?: boolean;
  replaceExisting?: boolean;
  videoDriver?: FilmVideoDriver;
}): Promise<
  | {
      status: "pending" | "succeeded" | "replay";
      jobId: string;
      assetId: string | null;
      providerJobId: string | null;
      creditsReserved: number;
      creditsCaptured: number;
      created: boolean;
    }
  | Failure
> {
  if (!input.confirmed) return fail("confirmation_required", "Confirm the server quote before video generation.", 402);
  if (input.endImagePolicy !== "same_scene_still") {
    return fail(
      "end_frame_required",
      "Vidu scene video uses the existing start-end request. Send endImagePolicy same_scene_still to use the selected still for both frames. A separate end frame is not invented.",
      400,
    );
  }
  const driver = input.videoDriver ?? (existingDriver("video") as FilmVideoDriver | null);
  if (!driver) {
    return fail("paid_provider_disabled", "Live Vidu stays behind VIDU_ENABLE_REAL_CALLS and ANIMATION_PROVIDER=vidu. It was not called.", 409);
  }
  const requestId = input.clientRequestId.trim();
  if (!requestId) return fail("idempotency_key", "A client request id is required.", 400);
  const owned = await loadOwnedScene(input.user.id, input.projectId, input.sceneId);
  if (!owned) return fail("not_found", "Film scene not found.", 404);
  const imageId = input.sceneImageId?.trim() || owned.scene.selectedSceneImageId || "";
  const image = await prisma.studioSceneImage.findFirst({
    where: { id: imageId, sceneId: owned.scene.id, status: "completed" },
    select: { id: true, imageUrl: true },
  });
  if (!image?.imageUrl.trim()) return fail("missing_reference_image", "This scene has no selected reference image.", 400);
  let durationSeconds: number;
  try {
    durationSeconds = resolveViduDurationSecondsForJob(owned.scene.durationSeconds);
  } catch {
    return fail("duration_unsupported", "This scene duration is outside the existing Vidu range of 1 to 16 seconds.", 400);
  }
  const existingAsset = await prisma.studioLibraryAsset.findUnique({
    where: { ownerId_sourceKind_sourceId: { ownerId: input.user.id, sourceKind: "scene_video", sourceId: owned.scene.id } },
  });
  if (existingAsset && existingAsset.deletedAt == null && existingAsset.downloadUrl.trim() && !input.replaceExisting) {
    return {
      status: "replay",
      jobId: existingAsset.generationJobId ?? "",
      assetId: existingAsset.id,
      providerJobId: null,
      creditsReserved: 0,
      creditsCaptured: 0,
      created: false,
    };
  }

  const idempotencyKey = `film-scene-video:${owned.scene.id}:${image.id}:${requestId}`;
  const created = await createGenerationJob({
    ownerId: input.user.id,
    idempotencyKey,
    capability: "VIDEO_GENERATE",
    storyboardId: owned.project.storyboardId,
    sceneId: owned.scene.id,
    providerAdapter: input.videoDriver ? certifiedMockAdapter : undefined,
    inputSnapshot: {
      sceneImageId: image.id,
      characterIds: owned.scene.characters.map((row) => row.character.id),
      endImagePolicy: "same_scene_still",
      characterIdentityLock: false,
    },
  });
  if (created.kind === "replay" && created.job.chargeFinalized) {
    return {
      status: "replay",
      jobId: created.job.id,
      assetId: created.job.outputAssetId,
      providerJobId: created.job.providerJobId,
      creditsReserved: created.job.creditsReserved,
      creditsCaptured: created.job.creditsCharged,
      created: false,
    };
  }
  if (created.kind !== "created") {
    if (created.job.status === "failed" || created.job.status === "cancelled") {
      return fail(created.job.errorCode || "provider_failed", created.job.errorMessageSafe || "Video generation already failed.", 409);
    }
    return {
      status: created.job.status === "succeeded" ? "succeeded" : "pending",
      jobId: created.job.id,
      assetId: created.job.outputAssetId,
      providerJobId: created.job.providerJobId,
      creditsReserved: created.job.creditsReserved,
      creditsCaptured: created.job.creditsCharged,
      created: false,
    };
  }

  const auth = await authorizeStudioAction({
    user: input.user,
    actionType: "motion_render",
    projectId: input.projectId,
    confirmed: true,
    metadataJson: { sceneId: owned.scene.id, generationJobId: created.job.id },
  });
  if (!auth.ok) {
    await updateGenerationJobStatus(created.job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: auth.code,
      errorMessageSafe: auth.message,
    });
    return fail(auth.code, auth.message, auth.code === "confirmation_required" ? 402 : 403);
  }

  await updateGenerationJobStatus(created.job.id, {
    status: "generating",
    startedAt: new Date(),
    creditsReserved: auth.reservation.requiredCredits,
    creditReservationId: auth.reservation.reservationId,
    metadataJson: { reservation: auth.reservation, sceneImageId: image.id },
  });

  const names = owned.scene.characters.map((row) => row.character.name).filter(Boolean);
  const prompt = [owned.scene.description || owned.scene.title || owned.project.title, names.length ? `Characters: ${names.join(", ")}` : ""]
    .filter(Boolean)
    .join(". ");
  let providerResult: Awaited<ReturnType<FilmVideoDriver["createJob"]>>;
  try {
    providerResult = await driver.createJob({
      transitionId: owned.scene.id,
      projectId: owned.project.id,
      startImageUrl: image.imageUrl,
      endImageUrl: image.imageUrl,
      prompt,
      durationSeconds,
      aspectRatio: "9:16",
      stylePreset: "studio",
      providerDurationSeconds: durationSeconds,
    });
  } catch (error) {
    await releaseReservation(input.user.id, input.projectId, auth.reservation);
    await updateGenerationJobStatus(created.job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: "provider_failed",
      errorMessageSafe: error instanceof Error ? error.message.slice(0, 300) : "Video generation failed.",
    });
    return fail("provider_failed", "Video generation failed and the reservation was released.", 502);
  }

  await updateGenerationJobStatus(created.job.id, {
    status: providerResult.status === "completed" ? "processing" : providerResult.status === "failed" ? "failed" : "generating",
    providerJobId: providerResult.providerJobId,
    failedAt: providerResult.status === "failed" ? new Date() : undefined,
    errorCode: providerResult.status === "failed" ? "provider_failed" : "",
    errorMessageSafe: providerResult.errorMessage ?? "",
  });
  if (providerResult.status === "failed") {
    await releaseReservation(input.user.id, input.projectId, auth.reservation);
    return fail("provider_failed", providerResult.errorMessage || "Video generation failed and the reservation was released.", 502);
  }
  if (providerResult.status !== "completed" || !providerResult.output) {
    return {
      status: "pending",
      jobId: created.job.id,
      assetId: null,
      providerJobId: providerResult.providerJobId,
      creditsReserved: auth.reservation.requiredCredits,
      creditsCaptured: 0,
      created: false,
    };
  }
  return finishVideoJob({
    user: input.user,
    projectId: input.projectId,
    sceneId: owned.scene.id,
    sceneTitle: owned.scene.title,
    sceneImageId: image.id,
    jobId: created.job.id,
    reservation: auth.reservation,
    providerJobId: providerResult.providerJobId,
    output: { ...providerResult.output, durationSeconds: providerResult.output.durationSeconds ?? durationSeconds },
    attachToTimeline: input.attachToTimeline === true,
  });
}

async function finishVideoJob(input: {
  user: Viewer;
  projectId: string;
  sceneId: string;
  sceneTitle: string;
  sceneImageId: string;
  jobId: string;
  reservation: StoredReservation;
  providerJobId: string;
  output: FilmMediaOutput;
  attachToTimeline: boolean;
}): Promise<
  | { status: "succeeded"; jobId: string; assetId: string; providerJobId: string; creditsReserved: number; creditsCaptured: number; created: boolean }
  | Failure
> {
  const stored = await storeMedia({ ownerId: input.user.id, sceneId: input.sceneId, kind: "video", output: input.output });
  if ("error" in stored) {
    await releaseReservation(input.user.id, input.projectId, input.reservation);
    await updateGenerationJobStatus(input.jobId, {
      status: "failed",
      failedAt: new Date(),
      errorCode: stored.error.code,
      errorMessageSafe: stored.error.message,
    });
    return stored;
  }
  const row = await upsertLibraryAsset({
    ownerId: input.user.id,
    projectId: input.projectId,
    family: "video",
    category: "scene-video",
    title: `${input.sceneTitle || "Scene"} video`,
    origin: "generated",
    previewUrl: stored.url,
    downloadUrl: stored.url,
    storageKey: stored.storageKey,
    mimeType: stored.mimeType,
    backingStore: stored.backingStore,
    sourceKind: "scene_video",
    sourceId: input.sceneId,
    generationJobId: input.jobId,
    generator: input.reservation.provider || "vidu",
    creditsSpent: input.reservation.requiredCredits,
    durationSeconds: input.output.durationSeconds ?? null,
    aspectRatio: "9:16",
    metadata: { projectId: input.projectId, sceneId: input.sceneId, sceneImageId: input.sceneImageId, providerJobId: input.providerJobId },
  });
  if (input.reservation.requiredCredits > 0) {
    await captureStudioActionReservation({
      userId: input.user.id,
      reservation: input.reservation,
      projectId: input.projectId,
      metadataJson: { sceneId: input.sceneId, generationJobId: input.jobId },
    });
  }
  await finalizeGenerationChargeOnce({
    jobId: input.jobId,
    creditsCharged: input.reservation.requiredCredits,
    creditReservationId: input.reservation.reservationId,
  });
  await updateGenerationJobStatus(input.jobId, {
    status: "succeeded",
    completedAt: new Date(),
    outputAssetId: row.id,
    providerJobId: input.providerJobId,
    creditsCharged: input.reservation.requiredCredits,
    chargeFinalized: true,
  });
  if (input.attachToTimeline) {
    await attachAsset({ ownerId: input.user.id, projectId: input.projectId, assetId: row.id, trackType: "VIDEO" });
  }
  return {
    status: "succeeded",
    jobId: input.jobId,
    assetId: row.id,
    providerJobId: input.providerJobId,
    creditsReserved: input.reservation.requiredCredits,
    creditsCaptured: input.reservation.requiredCredits,
    created: true,
  };
}

export async function completeFilmSceneVideo(input: {
  user: Viewer;
  projectId: string;
  jobId: string;
  attachToTimeline?: boolean;
  videoDriver?: FilmVideoDriver;
}): Promise<
  | { status: "pending" | "succeeded" | "replay"; jobId: string; assetId: string | null; creditsCaptured: number }
  | Failure
> {
  const job = await getGenerationJobForOwner(input.jobId, input.user.id);
  if (!job || job.sceneId == null) return fail("not_found", "Generation job not found.", 404);
  if (job.chargeFinalized && job.outputAssetId) {
    return { status: "replay", jobId: job.id, assetId: job.outputAssetId, creditsCaptured: 0 };
  }
  if (job.status === "failed" || job.status === "cancelled") {
    return fail(job.errorCode || "provider_failed", job.errorMessageSafe || "Video generation failed.", 409);
  }
  const driver = input.videoDriver ?? (existingDriver("video") as FilmVideoDriver | null);
  if (!driver || !job.providerJobId) {
    return fail("paid_provider_disabled", "The video job cannot be reconciled without the existing Vidu provider.", 409);
  }
  let status: Awaited<ReturnType<FilmVideoDriver["readJob"]>>;
  try {
    status = await driver.readJob(job.providerJobId);
  } catch {
    return fail("provider_timeout", "The video provider did not answer. The reservation is still held.", 503);
  }
  const reservation = reservationFrom(job);
  if (status.status === "queued" || status.status === "generating") {
    return { status: "pending", jobId: job.id, assetId: null, creditsCaptured: 0 };
  }
  if (status.status === "failed" || !status.output) {
    await releaseReservation(input.user.id, input.projectId, reservation);
    await updateGenerationJobStatus(job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: "provider_failed",
      errorMessageSafe: status.errorMessage || "Video generation failed.",
    });
    return fail("provider_failed", "Video generation failed and the reservation was released.", 502);
  }
  const owned = await loadOwnedScene(input.user.id, input.projectId, job.sceneId);
  if (!owned) return fail("not_found", "Film scene not found.", 404);
  if (!reservation) return fail("reservation_missing", "The video reservation could not be reconciled.", 409);
  return finishVideoJob({
    user: input.user,
    projectId: input.projectId,
    sceneId: owned.scene.id,
    sceneTitle: owned.scene.title,
    sceneImageId: "",
    jobId: job.id,
    reservation,
    providerJobId: job.providerJobId,
    output: status.output,
    attachToTimeline: input.attachToTimeline === true,
  });
}

export async function quoteFilmSceneDialogue(input: {
  user: Viewer;
  projectId: string;
  sceneId: string;
  characterId?: string;
  voiceProfile?: string;
}): Promise<
  | { actionType: "voice_generation"; requiredCredits: number; allowed: boolean; reason: string | null; voiceProfile: string; provider: "elevenlabs" }
  | Failure
> {
  const prepared = await prepareDialogue(input);
  if ("error" in prepared) return prepared;
  const preview = await previewStudioCreditAuthorization({
    user: input.user,
    actionType: "voice_generation",
    projectId: input.projectId,
  });
  return {
    actionType: "voice_generation",
    requiredCredits: preview.requiredCredits,
    allowed: preview.allowed,
    reason: preview.reason,
    voiceProfile: prepared.voiceProfile,
    provider: "elevenlabs",
  };
}

async function prepareDialogue(input: {
  user: Viewer;
  projectId: string;
  sceneId: string;
  characterId?: string;
  voiceProfile?: string;
}): Promise<{ sceneTitle: string; line: string; voiceProfile: string; language: string; storyboardId: string } | Failure> {
  const owned = await loadOwnedScene(input.user.id, input.projectId, input.sceneId);
  if (!owned?.project.storyboardId) return fail("not_found", "Film scene not found.", 404);
  const line = owned.scene.dialogueText?.trim() ?? "";
  if (!line) return fail("dialogue", "This scene has no dialogue to speak.", 400);
  const character = input.characterId
    ? owned.scene.characters.find((row) => row.character.id === input.characterId)?.character
    : undefined;
  if (input.characterId && !character) return fail("character_not_assigned", "That character is not assigned to this scene.", 403);
  const voiceProfile = (character?.voiceProfile || input.voiceProfile || "").trim();
  if (!isStudioVoiceProfileId(voiceProfile)) {
    return fail("voice_unavailable", "Choose an available Studio voice. An unknown voice is not replaced.", 400);
  }
  const language = (character?.voiceLanguage || "nl").trim().toLowerCase().slice(0, 2);
  const valid = validateVoiceSettings({
    voiceEnabled: true,
    voiceLanguage: language,
    voiceProfile,
    narrationMode: "commercial",
    script: line,
  });
  if (!valid.ok) return fail(valid.code.toLowerCase(), valid.message, 400);
  return { sceneTitle: owned.scene.title, line, voiceProfile, language, storyboardId: owned.project.storyboardId };
}

export async function startFilmSceneDialogue(input: {
  user: Viewer;
  projectId: string;
  sceneId: string;
  characterId?: string;
  voiceProfile?: string;
  clientRequestId: string;
  confirmed: boolean;
  attachToTimeline?: boolean;
  replaceExisting?: boolean;
  voiceDriver?: VoiceProvider;
}): Promise<
  | { status: "succeeded" | "replay"; jobId: string; assetId: string | null; creditsCaptured: number; created: boolean }
  | Failure
> {
  if (!input.confirmed) return fail("confirmation_required", "Confirm the server quote before dialogue generation.", 402);
  const driver = input.voiceDriver ?? (existingDriver("voice") as VoiceProvider | null);
  if (!driver) {
    return fail(
      "paid_provider_disabled",
      "Live ElevenLabs stays behind STUDIO_VOICE_PROVIDER=elevenlabs and ELEVENLABS_API_KEY. It was not called.",
      409,
    );
  }
  if (!input.voiceDriver && driver.id !== "elevenlabs") {
    return fail("paid_provider_disabled", "The existing ElevenLabs provider was not selected.", 409);
  }
  const requestId = input.clientRequestId.trim();
  if (!requestId) return fail("idempotency_key", "A client request id is required.", 400);
  const prepared = await prepareDialogue(input);
  if ("error" in prepared) return prepared;
  const existingAsset = await prisma.studioLibraryAsset.findUnique({
    where: { ownerId_sourceKind_sourceId: { ownerId: input.user.id, sourceKind: "scene_dialogue", sourceId: input.sceneId } },
  });
  if (existingAsset && existingAsset.deletedAt == null && existingAsset.downloadUrl.trim() && !input.replaceExisting) {
    return { status: "replay", jobId: existingAsset.generationJobId ?? "", assetId: existingAsset.id, creditsCaptured: 0, created: false };
  }
  const idempotencyKey = `film-scene-dialogue:${input.sceneId}:${prepared.voiceProfile}:${requestId}`;
  const created = await createGenerationJob({
    ownerId: input.user.id,
    idempotencyKey,
    capability: "VOICE_TTS",
    storyboardId: prepared.storyboardId,
    sceneId: input.sceneId,
    inputSnapshot: { characterId: input.characterId ?? null, voiceProfile: prepared.voiceProfile },
  });
  if (created.kind !== "created") {
    if (created.job.status === "failed" || created.job.status === "cancelled") {
      return fail(created.job.errorCode || "provider_failed", created.job.errorMessageSafe || "Dialogue generation already failed.", 409);
    }
    return {
      status: "replay",
      jobId: created.job.id,
      assetId: created.job.outputAssetId,
      creditsCaptured: 0,
      created: false,
    };
  }
  const auth = await authorizeStudioAction({
    user: input.user,
    actionType: "voice_generation",
    projectId: input.projectId,
    confirmed: true,
    metadataJson: { sceneId: input.sceneId, generationJobId: created.job.id },
  });
  if (!auth.ok) {
    await updateGenerationJobStatus(created.job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: auth.code,
      errorMessageSafe: auth.message,
    });
    return fail(auth.code, auth.message, 403);
  }
  await updateGenerationJobStatus(created.job.id, {
    status: "generating",
    startedAt: new Date(),
    creditsReserved: auth.reservation.requiredCredits,
    creditReservationId: auth.reservation.reservationId,
    metadataJson: { reservation: auth.reservation },
  });
  const preset = getVoiceProfilePreset(prepared.voiceProfile);
  const request = buildVoiceRequest({
    script: prepared.line,
    voiceProfile: preset.id,
    voiceLanguage: prepared.language,
    narrationMode: "commercial",
    preset,
  });
  let spoken: Awaited<ReturnType<VoiceProvider["synthesize"]>>;
  try {
    spoken = await driver.synthesize({ request, voiceProfile: preset.id, voiceLanguage: prepared.language });
  } catch (error) {
    await releaseReservation(input.user.id, input.projectId, auth.reservation);
    await updateGenerationJobStatus(created.job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: "provider_failed",
      errorMessageSafe: error instanceof Error ? error.message.slice(0, 300) : "Dialogue generation failed.",
    });
    return fail("provider_failed", "Dialogue generation failed and the reservation was released.", 502);
  }
  if (spoken.provider === "mock" && !input.voiceDriver) {
    await releaseReservation(input.user.id, input.projectId, auth.reservation);
    await updateGenerationJobStatus(created.job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: "paid_provider_disabled",
      errorMessageSafe: "A mock voice response was not captured.",
    });
    return fail("paid_provider_disabled", "A mock voice response was not captured.", 409);
  }
  const stored = await storeMedia({
    ownerId: input.user.id,
    sceneId: input.sceneId,
    kind: "voice",
    output: { bytes: spoken.audioBuffer, mimeType: "audio/wav", durationSeconds: spoken.durationSeconds },
  });
  if ("error" in stored) {
    await releaseReservation(input.user.id, input.projectId, auth.reservation);
    await updateGenerationJobStatus(created.job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: stored.error.code,
      errorMessageSafe: stored.error.message,
    });
    return stored;
  }
  const row = await upsertLibraryAsset({
    ownerId: input.user.id,
    projectId: input.projectId,
    family: "voice",
    category: "scene-dialogue",
    title: `${prepared.sceneTitle || "Scene"} dialogue`,
    origin: "generated",
    previewUrl: stored.url,
    downloadUrl: stored.url,
    storageKey: stored.storageKey,
    mimeType: stored.mimeType,
    backingStore: stored.backingStore,
    sourceKind: "scene_dialogue",
    sourceId: input.sceneId,
    generationJobId: created.job.id,
    generator: spoken.provider,
    creditsSpent: auth.reservation.requiredCredits,
    durationSeconds: spoken.durationSeconds,
    language: prepared.language,
    metadata: { projectId: input.projectId, sceneId: input.sceneId, characterId: input.characterId ?? null, provider: spoken.provider },
  });
  if (auth.reservation.requiredCredits > 0) {
    await captureStudioActionReservation({
      userId: input.user.id,
      reservation: auth.reservation,
      projectId: input.projectId,
      metadataJson: { sceneId: input.sceneId, generationJobId: created.job.id },
    });
  }
  await finalizeGenerationChargeOnce({
    jobId: created.job.id,
    creditsCharged: auth.reservation.requiredCredits,
    creditReservationId: auth.reservation.reservationId,
  });
  await updateGenerationJobStatus(created.job.id, {
    status: "succeeded",
    completedAt: new Date(),
    outputAssetId: row.id,
    creditsCharged: auth.reservation.requiredCredits,
    chargeFinalized: true,
  });
  if (input.attachToTimeline) {
    await attachAsset({ ownerId: input.user.id, projectId: input.projectId, assetId: row.id, trackType: "DIALOGUE" });
  }
  return {
    status: "succeeded",
    jobId: created.job.id,
    assetId: row.id,
    creditsCaptured: auth.reservation.requiredCredits,
    created: true,
  };
}

export async function inspectFilmGenerationGaps(ownerId: string, projectId: string) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
    select: { storyboardId: true },
  });
  if (!project?.storyboardId) return null;
  const scenes = await prisma.studioScene.findMany({
    where: { storyboardId: project.storyboardId, storyboard: { ownerId } },
    orderBy: { order: "asc" },
    select: { id: true, title: true, dialogueText: true, selectedSceneImageId: true },
  });
  const assets = await prisma.studioLibraryAsset.findMany({
    where: { ownerId, projectId, deletedAt: null, sourceKind: { in: ["scene_video", "scene_dialogue"] } },
    select: { sourceKind: true, sourceId: true },
  });
  const videos = new Set(assets.filter((asset) => asset.sourceKind === "scene_video").map((asset) => asset.sourceId));
  const dialogue = new Set(assets.filter((asset) => asset.sourceKind === "scene_dialogue").map((asset) => asset.sourceId));
  return scenes.map((scene) => ({
    sceneId: scene.id,
    title: scene.title,
    missingReferenceImage: !scene.selectedSceneImageId,
    missingVideo: !videos.has(scene.id),
    missingDialogue: Boolean(scene.dialogueText?.trim()) && !dialogue.has(scene.id),
    paidProviderCalls: 0,
  }));
}
