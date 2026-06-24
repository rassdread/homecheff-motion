#!/usr/bin/env npx tsx
/**
 * Live staging production proof — drives real server pipelines, collects evidence.
 * Usage: npx tsx scripts/staging-production-proof.ts --scenario video-edit|travel|commercial|music
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { getBlobReadWriteToken, uploadPublicBlob } from "../src/lib/vercel-blob-config";
import { buildPhotoMoviePlan } from "../src/lib/studio-photo-movie-plan";
import { buildMusicVideoProductionPlan } from "../src/lib/studio-music-video-plan";
import { analyzeAudioBuffer } from "../src/lib/studio-audio-analysis";
import { bootstrapStoryboardFromOrchestrator } from "../src/server/studio/studio-orchestrator-bootstrap";
import { assignPhotoUrlsToStoryboardScenes } from "../src/server/studio/studio-photo-scene-assign";
import {
  assignCommercialAssetsToStoryboardScenes,
} from "../src/server/studio/studio-commercial-scene-assign";
import { ensureStoryboardSceneImagesForProduction } from "../src/server/studio/studio-scene-image-service";
import { renderProductionBatch } from "../src/server/studio/studio-production-batch-render";
import { mergeProductionBatchSegments } from "../src/lib/studio-production-batch-executor";
import { initProductionExecution, buildRenderBatchPlanForOrchestrator } from "../src/lib/studio-production-batch-plan";
import { exportPublishProjectVideo } from "../src/server/publish/publish-video-export-service";
import { hydratePublishProjectWithOrchestratorMusic } from "../src/lib/studio-publish-production-bridge";
import { createPublishProject } from "../src/lib/publish-overlay-session";
import {
  authorizeStudioAction,
  captureStudioActionReservation,
  refundStudioActionReservation,
} from "../src/server/studio-account/studio-credit-authorization";
import { grantStudioCredits } from "../src/server/studio-account/studio-wallet-service";
import { ensureStudioAccount } from "../src/server/studio-account/ensure-studio-account";
import { pollProjectJobs } from "../src/server/animation-jobs/service";
import { getInstantPremiumStatus } from "../src/server/instant-premium/status-service";
import { defaultOrchestratorState } from "../src/lib/studio-orchestrator-phases";
import type { HcOrchestratorState } from "../src/types/studio-video-production";
import type { SessionUser } from "../src/server/auth/session";
import path from "node:path";
import os from "node:os";

function loadEnv() {
  for (const name of [".env", ".env.local"]) {
    const filePath = resolve(process.cwd(), name);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

type AudioProbe = {
  hasAudio: boolean;
  codec?: string;
  durationSeconds?: number;
  bitrate?: number;
  sampleRate?: number;
};

type BillingTrace = {
  transactionId?: string;
  reservationId?: string;
  captureLedgerIds: string[];
  refundLedgerIds: string[];
  doubleCaptureDetected: boolean;
  adminBypass: boolean;
};

type Evidence = {
  scenario: string;
  result: "PASS" | "PARTIAL" | "FAIL";
  startedAt: string;
  finishedAt: string;
  hcProjectId?: string;
  storyboardId?: string;
  renderProjectIds: string[];
  batchCount?: number;
  sceneCount?: number;
  photosUploaded?: number;
  photosUsedInScenes?: number;
  segmentDurationsSeconds?: number[];
  mergedDurationSeconds?: number;
  finalMp4Url?: string;
  finalDurationSeconds?: number;
  sourceAudioDurationSeconds?: number;
  hasAudioStream?: boolean;
  audioVerification?: AudioProbe;
  audioMatchPass?: boolean;
  creditsReserved?: number;
  creditsCaptured?: number;
  billing?: BillingTrace;
  errors: string[];
  notes: string[];
};

const EVIDENCE_PATH = resolve(process.cwd(), "staging-proof-evidence.json");

function ffprobeDuration(urlOrPath: string): number | null {
  const r = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    urlOrPath,
  ], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const n = parseFloat(r.stdout.trim());
  return Number.isFinite(n) ? n : null;
}

function ffprobeHasAudio(urlOrPath: string): boolean {
  return ffprobeAudio(urlOrPath).hasAudio;
}

function ffprobeAudio(urlOrPath: string): AudioProbe {
  const r = spawnSync("ffprobe", [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=codec_name,duration,bit_rate,sample_rate",
    "-of", "json",
    urlOrPath,
  ], { encoding: "utf8", maxBuffer: 2_000_000 });
  if (r.status !== 0) return { hasAudio: false };
  try {
    const parsed = JSON.parse(r.stdout) as { streams?: Array<Record<string, string>> };
    const stream = parsed.streams?.[0];
    if (!stream) return { hasAudio: false };
    return {
      hasAudio: true,
      codec: stream.codec_name,
      durationSeconds: stream.duration ? parseFloat(stream.duration) : undefined,
      bitrate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : undefined,
      sampleRate: stream.sample_rate ? parseInt(stream.sample_rate, 10) : undefined,
    };
  } catch {
    return { hasAudio: false };
  }
}

function audioMatchesSource(sourceSeconds: number, output: AudioProbe, videoSeconds?: number): boolean {
  if (!output.hasAudio) return false;
  const outDur = output.durationSeconds ?? videoSeconds;
  if (outDur == null) return false;
  return Math.abs(outDur - sourceSeconds) < 10;
}

async function countPhotosUsedInStoryboard(storyboardId: string): Promise<number> {
  const scenes = await prisma.studioScene.findMany({
    where: { storyboardId },
    include: { sceneImages: { where: { status: "completed" } } },
  });
  const urls = new Set<string>();
  for (const scene of scenes) {
    for (const img of scene.sceneImages) {
      const url = img.imageUrl?.trim() || img.thumbnailUrl?.trim();
      if (url) urls.add(url);
    }
  }
  return urls.size;
}

async function getAdmin(): Promise<SessionUser> {
  const user = await prisma.user.findFirst({ where: { role: "admin", isActive: true } });
  if (!user) throw new Error("No active admin user");
  return user;
}

async function uploadBuffer(params: {
  userId: string;
  buffer: Buffer;
  ext: string;
  contentType: string;
  folder: string;
}): Promise<string> {
  const token = getBlobReadWriteToken();
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN missing");
  const pathname = `staging-proof/${params.userId}/${params.folder}/${randomUUID()}.${params.ext}`;
  const blob = await put(pathname, params.buffer, {
    access: "public",
    token,
    contentType: params.contentType,
  });
  return blob.url;
}

async function pollAnimationFinalVideo(projectId: string, maxMs = 1_200_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    await pollProjectJobs(projectId).catch(() => undefined);
    try {
      const status = await getInstantPremiumStatus(projectId);
      const finalUrl = status.finalVideoUrl?.trim();
      if (finalUrl) return finalUrl;
      if (status.status === "failed" || status.status === "cancelled") {
        throw new Error(`Motion project ${status.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("failed") || message.includes("cancelled")) {
        throw error;
      }
    }

    const exp = await prisma.animationExport.findFirst({
      where: { projectId, status: "completed", outputVideoUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { outputVideoUrl: true },
    });
    if (exp?.outputVideoUrl) return exp.outputVideoUrl;

    const project = await prisma.animationProject.findUnique({
      where: { id: projectId },
      select: {
        status: true,
        failureReason: true,
        transitions: {
          where: { status: { in: ["completed", "failed"] } },
          orderBy: { order: "asc" },
          select: { status: true, outputVideoUrl: true, errorMessage: true },
        },
      },
    });
    if (project?.status === "failed" || project?.status === "cancelled") {
      const transitionError = project.transitions.find((t) => t.errorMessage?.trim())?.errorMessage?.trim();
      throw new Error(transitionError ?? project.failureReason ?? `Motion project ${project.status}`);
    }
    const segment = project?.transitions.find((t) => t.outputVideoUrl?.trim())?.outputVideoUrl?.trim();
    if (segment && (project?.transitions.length ?? 0) > 0) {
      const allDone = project!.transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim());
      if (allDone) return segment;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Motion render timed out");
}

async function runRenderPipeline(params: {
  viewer: SessionUser;
  orchestrator: HcOrchestratorState;
  storyboardId: string;
}): Promise<{
  mergedUrl: string;
  renderProjectIds: string[];
  segmentDurationsSeconds: number[];
  execution: ReturnType<typeof initProductionExecution>;
}> {
  const batchPlan = buildRenderBatchPlanForOrchestrator({
    photoMoviePlan: params.orchestrator.photoMoviePlan,
    musicVideoPlan: params.orchestrator.musicVideoPlan,
    longFormPlan: params.orchestrator.longFormPlan,
  });
  if (!batchPlan) throw new Error("No render batch plan");

  let execution = initProductionExecution({
    renderBatchPlan: batchPlan,
    musicAudioUrl: params.orchestrator.musicAudioUrl,
  });

  const renderProjectIds: string[] = [];
  const segmentDurationsSeconds: number[] = [];

  for (let batchIndex = 0; batchIndex < batchPlan.batchCount; batchIndex++) {
    const sceneIndices = batchPlan.batches[batchIndex]?.sceneIndices ?? [];
    const render = await renderProductionBatch({
      viewer: params.viewer,
      storyboardId: params.storyboardId,
      sceneIndices,
      batchIndex,
    });
    if (!render.ok) throw new Error(`${render.code}: ${render.error}`);
    renderProjectIds.push(render.projectId);
    const segmentUrl = await pollAnimationFinalVideo(render.projectId);
    const segDur = ffprobeDuration(segmentUrl);
    if (segDur != null) segmentDurationsSeconds.push(segDur);
    execution = {
      ...execution,
      batches: execution.batches.map((b, i) =>
        i === batchIndex ? { ...b, status: "completed", segmentVideoUrl: segmentUrl } : b
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  if (batchPlan.ffmpegMergeRequired) {
    const tmpDir = path.join(os.tmpdir(), "hc-staging-proof-merge", params.storyboardId);
    mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, `merged-${Date.now()}.mp4`);
    const merged = await mergeProductionBatchSegments({ execution, tmpDir, outputPath });
    if (!merged.ok) throw new Error(merged.error);
    let mergedUrl = merged.mergedVideoUrl;
    if (!mergedUrl.startsWith("http")) {
      const bytes = await import("node:fs/promises").then((fs) => fs.readFile(mergedUrl));
      const uploaded = await uploadPublicBlob({
        pathname: `staging-proof/merge/${params.storyboardId}/${Date.now()}.mp4`,
        body: bytes,
        contentType: "video/mp4",
        context: { uploadTarget: "staging-proof-merge", provider: "ffmpeg" },
      });
      mergedUrl = uploaded.url;
    }
    return { mergedUrl, renderProjectIds, segmentDurationsSeconds, execution };
  }

  const single = execution.batches.find((b) => b.segmentVideoUrl)?.segmentVideoUrl;
  if (!single) throw new Error("No segment after render");
  const singleDur = ffprobeDuration(single);
  if (singleDur != null) segmentDurationsSeconds.push(singleDur);
  return { mergedUrl: single, renderProjectIds, segmentDurationsSeconds, execution };
}

async function exportFinishVideo(params: {
  videoUrl: string;
  orchestrator?: HcOrchestratorState;
  title: string;
}): Promise<string> {
  let project = createPublishProject({
    name: params.title,
    videoUrl: params.videoUrl,
    source: "editor",
    metadata: { autoFinish: true, stagingProof: true },
  });
  if (params.orchestrator) {
    project = hydratePublishProjectWithOrchestratorMusic(project, params.orchestrator);
  }
  const result = await exportPublishProjectVideo(project);
  if (!result.ok) throw new Error(result.error);
  if (result.outputUrl) return result.outputUrl;
  const bytes = await import("node:fs/promises").then((fs) => fs.readFile(result.outputPath));
  const uploaded = await uploadPublicBlob({
    pathname: `staging-proof/export/${randomUUID()}.mp4`,
    body: bytes,
    contentType: "video/mp4",
    context: { uploadTarget: "staging-proof-export", provider: "ffmpeg" },
  });
  return uploaded.url;
}

async function proveVideoEdit(viewer: SessionUser): Promise<Evidence> {
  const ev: Evidence = {
    scenario: "video-edit",
    result: "FAIL",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    renderProjectIds: [],
    errors: [],
    notes: ["Generation pipeline bypassed — Finish Video export only"],
  };

  try {
    const source = await prisma.animationExport.findFirst({
      where: { status: "completed", outputVideoUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { outputVideoUrl: true },
    });
    if (!source?.outputVideoUrl) throw new Error("No source MP4 in database");

    ev.notes.push(`Source: ${source.outputVideoUrl}`);
    const exported = await exportFinishVideo({
      videoUrl: source.outputVideoUrl,
      title: "Staging proof video edit",
    });
    ev.finalMp4Url = exported;
    ev.finalDurationSeconds = ffprobeDuration(exported) ?? undefined;
    ev.hasAudioStream = ffprobeHasAudio(exported);
    ev.result = exported && ev.finalDurationSeconds ? "PASS" : "PARTIAL";
  } catch (e) {
    ev.errors.push(e instanceof Error ? e.message : String(e));
    ev.result = "FAIL";
  }

  ev.finishedAt = new Date().toISOString();
  return ev;
}

async function proveTravel(viewer: SessionUser, photoCount: number): Promise<Evidence> {
  const ev: Evidence = {
    scenario: `travel-${photoCount}-photos`,
    result: "FAIL",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    renderProjectIds: [],
    errors: [],
    notes: [],
  };

  try {
    const photoMoviePlan = buildPhotoMoviePlan({ photoCount, intent: "travel_vlog" });
    ev.sceneCount = photoMoviePlan.sceneCount;
    ev.batchCount = photoMoviePlan.renderBatchCount;
    ev.notes.push(`Plan: ${photoMoviePlan.sceneCount} scenes, ${photoMoviePlan.renderBatchCount} batches`);

    const token = getBlobReadWriteToken();
    if (!token) throw new Error("Blob token missing");

    const samplePath = resolve(process.cwd(), "public/homecheff-globe-man.png");
    const sample = readFileSync(samplePath);
    const photoUrls: string[] = [];
    for (let i = 0; i < photoCount; i++) {
      photoUrls.push(
        await uploadBuffer({
          userId: viewer.id,
          buffer: sample,
          ext: "png",
          contentType: "image/png",
          folder: "photos",
        })
      );
    }
    ev.notes.push(`Uploaded ${photoUrls.length} photos`);

    const orchestrator: HcOrchestratorState = {
      ...defaultOrchestratorState(),
      intent: "travel_vlog",
      idea: "Create a travel movie",
      photoMoviePlan,
      persistedAssets: photoUrls.map((url, i) => ({
        id: `photo_${i}`,
        kind: "photo" as const,
        url,
        fileName: `photo-${i}.png`,
        uploadedAt: new Date().toISOString(),
      })),
    };

    const bootstrap = await bootstrapStoryboardFromOrchestrator({
      viewer,
      orchestrator,
      idea: orchestrator.idea,
    });
    if (!bootstrap.ok) throw new Error(bootstrap.error);
    ev.storyboardId = bootstrap.storyboardId;

    await assignPhotoUrlsToStoryboardScenes({
      storyboardId: bootstrap.storyboardId,
      viewer,
      photoUrls,
    });
    ev.photosUploaded = photoUrls.length;
    ev.photosUsedInScenes = await countPhotosUsedInStoryboard(bootstrap.storyboardId);
    ev.notes.push(`Photos: uploaded ${ev.photosUploaded}, unique in scenes ${ev.photosUsedInScenes}`);

    const images = await ensureStoryboardSceneImagesForProduction({
      storyboardId: bootstrap.storyboardId,
      viewer,
    });
    if (!images.ok) throw new Error(images.error);
    ev.notes.push(`Scene images: generated ${images.generated}, skipped ${images.skipped}`);

    const { mergedUrl, renderProjectIds, segmentDurationsSeconds } = await runRenderPipeline({
      viewer,
      orchestrator,
      storyboardId: bootstrap.storyboardId,
    });
    ev.renderProjectIds = renderProjectIds;
    ev.segmentDurationsSeconds = segmentDurationsSeconds;
    ev.mergedDurationSeconds = ffprobeDuration(mergedUrl) ?? undefined;
    ev.notes.push(`Rendered ${renderProjectIds.length} batch(es), segments=${segmentDurationsSeconds.map((d) => d.toFixed(1)).join("+")}s`);

    const exported = await exportFinishVideo({
      videoUrl: mergedUrl,
      title: "Staging proof travel movie",
    });
    ev.finalMp4Url = exported;
    ev.finalDurationSeconds = ffprobeDuration(exported) ?? undefined;
    ev.hasAudioStream = ffprobeHasAudio(exported);

    if (exported && ev.finalDurationSeconds && ev.finalDurationSeconds > 0) {
      const photoOk = (ev.photosUsedInScenes ?? 0) >= (ev.sceneCount ?? photoCount);
      const mergeOk = !photoMoviePlan.ffmpegMergeRequired || (ev.segmentDurationsSeconds?.length ?? 0) >= (ev.batchCount ?? 1);
      const unusedPhotos = photoCount - (ev.photosUsedInScenes ?? 0);
      if (unusedPhotos > 0) {
        ev.notes.push(`${unusedPhotos} uploaded photo(s) not assigned to scenes (scene cap ${ev.sceneCount})`);
      }
      ev.result = photoOk && mergeOk ? "PASS" : exported ? "PARTIAL" : "FAIL";
    } else {
      ev.result = "PARTIAL";
    }
  } catch (e) {
    ev.errors.push(e instanceof Error ? e.message : String(e));
    ev.result = "FAIL";
  }

  ev.finishedAt = new Date().toISOString();
  return ev;
}

async function proveCommercial(viewer: SessionUser): Promise<Evidence> {
  const ev: Evidence = {
    scenario: "product-commercial",
    result: "FAIL",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    renderProjectIds: [],
    errors: [],
    notes: [],
  };

  try {
    const samplePath = resolve(process.cwd(), "public/homecheff-globe-man.png");
    const sample = readFileSync(samplePath);
    const logoUrl = await uploadBuffer({
      userId: viewer.id,
      buffer: sample,
      ext: "png",
      contentType: "image/png",
      folder: "logo",
    });
    const productUrl = await uploadBuffer({
      userId: viewer.id,
      buffer: sample,
      ext: "png",
      contentType: "image/png",
      folder: "product",
    });

    const photoMoviePlan = buildPhotoMoviePlan({ photoCount: 2, intent: "photo_story" });
    const orchestrator: HcOrchestratorState = {
      ...defaultOrchestratorState(),
      intent: "product_commercial",
      idea: "Create a commercial",
      photoMoviePlan,
      persistedAssets: [
        { id: "logo", kind: "logo", url: logoUrl, fileName: "logo.png", uploadedAt: new Date().toISOString() },
        { id: "p1", kind: "product_image", url: productUrl, fileName: "product.png", uploadedAt: new Date().toISOString() },
      ],
    };
    ev.sceneCount = photoMoviePlan.sceneCount;
    ev.batchCount = photoMoviePlan.renderBatchCount;

    const bootstrap = await bootstrapStoryboardFromOrchestrator({ viewer, orchestrator });
    if (!bootstrap.ok) throw new Error(bootstrap.error);
    ev.storyboardId = bootstrap.storyboardId;

    const commercial = await assignCommercialAssetsToStoryboardScenes({
      storyboardId: bootstrap.storyboardId,
      viewer,
      logoUrl,
      productUrls: [productUrl],
    });
    if (!commercial.ok) throw new Error(commercial.error);
    ev.notes.push(`Commercial assets assigned: ${commercial.assigned}`);

    const images = await ensureStoryboardSceneImagesForProduction({
      storyboardId: bootstrap.storyboardId,
      viewer,
    });
    if (!images.ok) throw new Error(images.error);

    const { mergedUrl, renderProjectIds } = await runRenderPipeline({
      viewer,
      orchestrator,
      storyboardId: bootstrap.storyboardId,
    });
    ev.renderProjectIds = renderProjectIds;

    const exported = await exportFinishVideo({
      videoUrl: mergedUrl,
      title: "Staging proof commercial",
    });
    ev.finalMp4Url = exported;
    ev.finalDurationSeconds = ffprobeDuration(exported) ?? undefined;
    ev.result = exported && ev.finalDurationSeconds ? "PASS" : "PARTIAL";
  } catch (e) {
    ev.errors.push(e instanceof Error ? e.message : String(e));
    ev.result = "FAIL";
  }

  ev.finishedAt = new Date().toISOString();
  return ev;
}

async function proveMusic(viewer: SessionUser, mp3DurationSeconds = 20): Promise<Evidence> {
  const scenarioLabel = mp3DurationSeconds <= 15 ? "music-video-small" : "music-video";
  const ev: Evidence = {
    scenario: scenarioLabel,
    result: "FAIL",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    renderProjectIds: [],
    errors: [],
    notes: [],
  };

  try {
    const tmpMp3 = path.join(os.tmpdir(), `hc-proof-${Date.now()}.mp3`);
    const gen = spawnSync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", `sine=frequency=440:duration=${mp3DurationSeconds}`,
      "-c:a", "libmp3lame", "-q:a", "4", tmpMp3,
    ], { encoding: "utf8" });
    if (gen.status !== 0) throw new Error("Could not generate test MP3");

    const mp3Buffer = await import("node:fs/promises").then((fs) => fs.readFile(tmpMp3));
    const musicUrl = await uploadBuffer({
      userId: viewer.id,
      buffer: mp3Buffer,
      ext: "mp3",
      contentType: "audio/mpeg",
      folder: "music",
    });

    const audioProfile = analyzeAudioBuffer({ buffer: mp3Buffer, extension: "mp3" });
    const probedDuration = ffprobeDuration(tmpMp3);
    if (probedDuration != null && probedDuration > 0) {
      audioProfile.durationSeconds = Math.round(probedDuration);
    }
    const musicVideoPlan = buildMusicVideoProductionPlan({ audioProfile });
    ev.sceneCount = musicVideoPlan.sceneCount;
    ev.batchCount = musicVideoPlan.mergePlan.batchCount;
    ev.notes.push(`Audio ${audioProfile.durationSeconds}s → ${musicVideoPlan.sceneCount} scenes`);
    ev.sourceAudioDurationSeconds = audioProfile.durationSeconds;

    const orchestrator: HcOrchestratorState = {
      ...defaultOrchestratorState(),
      intent: "music_video",
      idea: "Create a cinematic music video",
      musicAudioUrl: musicUrl,
      audioAnalysis: audioProfile,
      musicVideoPlan,
      persistedAssets: [
        { id: "music", kind: "music", url: musicUrl, fileName: "track.mp3", uploadedAt: new Date().toISOString() },
      ],
    };

    const bootstrap = await bootstrapStoryboardFromOrchestrator({ viewer, orchestrator });
    if (!bootstrap.ok) throw new Error(bootstrap.error);
    ev.storyboardId = bootstrap.storyboardId;

    const images = await ensureStoryboardSceneImagesForProduction({
      storyboardId: bootstrap.storyboardId,
      viewer,
    });
    if (!images.ok) throw new Error(images.error);
    ev.notes.push(`Scene images generated: ${images.generated}`);

    const { mergedUrl, renderProjectIds, segmentDurationsSeconds } = await runRenderPipeline({
      viewer,
      orchestrator,
      storyboardId: bootstrap.storyboardId,
    });
    ev.renderProjectIds = renderProjectIds;
    ev.segmentDurationsSeconds = segmentDurationsSeconds;
    ev.mergedDurationSeconds = ffprobeDuration(mergedUrl) ?? undefined;

    const exported = await exportFinishVideo({
      videoUrl: mergedUrl,
      orchestrator,
      title: "Staging proof music video",
    });
    ev.finalMp4Url = exported;
    ev.finalDurationSeconds = ffprobeDuration(exported) ?? undefined;
    ev.audioVerification = ffprobeAudio(exported);
    ev.hasAudioStream = ev.audioVerification.hasAudio;
    ev.audioMatchPass = audioMatchesSource(
      audioProfile.durationSeconds,
      ev.audioVerification,
      ev.finalDurationSeconds
    );

    ev.result =
      exported && ev.audioMatchPass && ev.hasAudioStream ? "PASS"
      : exported && ev.hasAudioStream ? "PARTIAL"
      : "FAIL";
    if (!ev.hasAudioStream) ev.errors.push("Final MP4 missing audio stream");
    if (!ev.audioMatchPass) {
      ev.errors.push(
        `Audio mismatch: output ${ev.audioVerification.durationSeconds ?? ev.finalDurationSeconds}s vs source ${audioProfile.durationSeconds}s (codec=${ev.audioVerification.codec ?? "?"})`
      );
    }
  } catch (e) {
    ev.errors.push(e instanceof Error ? e.message : String(e));
    ev.result = "FAIL";
  }

  ev.finishedAt = new Date().toISOString();
  return ev;
}

async function getBillingTestUser(): Promise<SessionUser> {
  const email = "staging-billing-proof@homecheff.eu";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: "$2a$10$stagingproofhash00000000000000000000000000000000000",
        role: "user",
        isActive: true,
      },
    });
  }
  await ensureStudioAccount(user.id, user.email);
  await grantStudioCredits({
    userId: user.id,
    credits: 50_000,
    actionType: "admin_grant",
    service: "staging-proof",
    provider: "internal",
    metadataJson: { reason: "staging-billing-proof" },
  });
  return user;
}

async function traceLedgerForReservation(reservationId: string) {
  const [reservationRow, linked] = await Promise.all([
    prisma.studioLedgerEntry.findMany({
      where: { id: reservationId },
      select: { id: true, actionType: true, creditsDelta: true, metadataJson: true },
    }),
    prisma.studioLedgerEntry.findMany({
      where: {
        metadataJson: { path: ["reservationId"], equals: reservationId },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, actionType: true, creditsDelta: true, metadataJson: true },
    }),
  ]);
  const seen = new Set<string>();
  return [...reservationRow, ...linked].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

async function proveBilling(): Promise<Evidence> {
  const ev: Evidence = {
    scenario: "billing-proof",
    result: "FAIL",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    renderProjectIds: [],
    errors: [],
    notes: [],
  };

  try {
    const user = await getBillingTestUser();
    ev.notes.push(`Billing test user: ${user.email}`);

    const auth = await authorizeStudioAction({
      user,
      actionType: "studio_orchestrator_production",
      confirmed: true,
      metadataJson: { stagingProof: true, phase: "reserve" },
    });
    if (!auth.ok) throw new Error(`Authorize failed: ${auth.code} ${auth.message}`);

    ev.billing = {
      reservationId: auth.reservation.reservationId,
      captureLedgerIds: [],
      refundLedgerIds: [],
      doubleCaptureDetected: false,
      adminBypass: auth.adminBypass === true,
    };
    ev.creditsReserved = auth.reservation.requiredCredits;

    if (auth.adminBypass) {
      ev.notes.push("Admin bypass detected on billing user — cannot prove live billing");
      ev.result = "PARTIAL";
      ev.finishedAt = new Date().toISOString();
      return ev;
    }

    const reserveEntries = await traceLedgerForReservation(auth.reservation.reservationId);
    ev.notes.push(`Reservation ledger entries: ${reserveEntries.length}`);

    await captureStudioActionReservation({
      userId: user.id,
      reservation: auth.reservation,
      metadataJson: { stagingProof: true, phase: "capture" },
    });

    const afterCapture = await traceLedgerForReservation(auth.reservation.reservationId);
    const captures = afterCapture.filter((e) => e.actionType === "usage_capture");
    ev.billing.captureLedgerIds = captures.map((e) => e.id);
    ev.creditsCaptured = auth.reservation.requiredCredits;

    if (captures.length !== 1) {
      ev.billing.doubleCaptureDetected = captures.length > 1;
      ev.errors.push(`Expected 1 capture, got ${captures.length}`);
    }

    const refundAuth = await authorizeStudioAction({
      user,
      actionType: "studio_orchestrator_production",
      confirmed: true,
      metadataJson: { stagingProof: true, phase: "refund-test" },
    });
    if (!refundAuth.ok) throw new Error(`Refund-test authorize failed: ${refundAuth.code}`);

    await refundStudioActionReservation({
      userId: user.id,
      reservation: refundAuth.reservation,
      failedGeneration: true,
      metadataJson: { stagingProof: true, phase: "refund" },
    });

    const refundEntries = await traceLedgerForReservation(refundAuth.reservation.reservationId);
    const refunds = refundEntries.filter(
      (e) => e.actionType === "usage_refund" || e.actionType === "failed_generation_refund"
    );
    ev.billing.refundLedgerIds = refunds.map((e) => e.id);

    if (refunds.length !== 1) {
      ev.errors.push(`Expected 1 refund, got ${refunds.length}`);
    }

    const singleCapture = captures.length === 1 && !ev.billing.doubleCaptureDetected;
    const singleRefund = refunds.length === 1;
    ev.result = singleCapture && singleRefund ? "PASS" : "PARTIAL";
    ev.notes.push(`Capture=${captures.length} Refund=${refunds.length} DoubleCapture=${ev.billing.doubleCaptureDetected}`);
  } catch (e) {
    ev.errors.push(e instanceof Error ? e.message : String(e));
    ev.result = "FAIL";
  }

  ev.finishedAt = new Date().toISOString();
  return ev;
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--scenario="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--scenario") + 1]
    ?? "video-edit";

  const viewer = await getAdmin();
  console.log(`[staging-proof] admin=${viewer.email} scenario=${arg}`);

  let evidence: Evidence;
  switch (arg) {
    case "video-edit":
      evidence = await proveVideoEdit(viewer);
      break;
    case "travel":
      evidence = await proveTravel(viewer, 20);
      break;
    case "travel-mini":
      evidence = await proveTravel(viewer, 4);
      break;
    case "commercial":
      evidence = await proveCommercial(viewer);
      break;
    case "music":
      evidence = await proveMusic(viewer);
      break;
    case "music-small":
      evidence = await proveMusic(viewer, 12);
      break;
    case "billing":
      evidence = await proveBilling();
      break;
    default:
      throw new Error(`Unknown scenario: ${arg}`);
  }

  let all: Evidence[] = [];
  if (existsSync(EVIDENCE_PATH)) {
    try {
      all = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as Evidence[];
    } catch {
      all = [];
    }
  }
  all = all.filter((e) => e.scenario !== evidence.scenario);
  all.push(evidence);
  writeFileSync(EVIDENCE_PATH, JSON.stringify(all, null, 2));

  console.log(JSON.stringify(evidence, null, 2));
  console.log(`[staging-proof] wrote ${EVIDENCE_PATH}`);
  process.exit(evidence.result === "PASS" ? 0 : 1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
