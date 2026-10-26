/**
 * Speaks scene dialogue through the existing voice provider.
 * An existing dialogue file is left in place.
 * ElevenLabs is not called when the provider is forced to mock.
 */

import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { buildVoiceRequest } from "@/lib/elevenlabs-voice";
import { prisma } from "@/lib/prisma";
import { localMediaDir, safeLocalFileName } from "@/lib/studio-local-media";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { resolveFfmpegForTextOverlay } from "@/lib/video-ffmpeg-capability";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";
import { selectVoiceProvider } from "@/server/studio/voice/voice-provider";

const execFileAsync = promisify(execFile);

type Failure = { error: { code: string; message: string; httpStatus: number } };

function fail(code: string, message: string, httpStatus: number): Failure {
  return { error: { code, message, httpStatus } };
}

export async function generateSceneDialogueAudio(input: {
  ownerId: string;
  projectId: string;
  sceneId: string;
  forceProvider: "mock";
  voiceProfile?: string;
}): Promise<
  | { assetId: string; url: string; created: boolean; provider: "mock"; durationSeconds: number; creditsSpent: 0 }
  | Failure
> {
  if (input.forceProvider !== "mock") {
    return fail(
      "paid_provider_disabled",
      "Live voice generation stays on the existing ElevenLabs service and wallet gate. It was not called.",
      409,
    );
  }
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.ownerId },
    select: { id: true, storyboardId: true },
  });
  if (!project?.storyboardId) return fail("not_found", "Film not found.", 404);
  const scene = await prisma.studioScene.findFirst({
    where: { id: input.sceneId, storyboardId: project.storyboardId, storyboard: { ownerId: input.ownerId } },
    select: { id: true, title: true, dialogueText: true },
  });
  if (!scene) return fail("not_found", "Scene not found.", 404);
  const line = scene.dialogueText?.trim() ?? "";
  if (!line) return fail("dialogue", "This scene has no dialogue to speak.", 400);

  const existing = await prisma.studioLibraryAsset.findUnique({
    where: {
      ownerId_sourceKind_sourceId: {
        ownerId: input.ownerId,
        sourceKind: "scene_dialogue",
        sourceId: scene.id,
      },
    },
  });
  if (existing && existing.deletedAt == null && existing.downloadUrl.trim()) {
    return {
      assetId: existing.id,
      url: existing.downloadUrl,
      created: false,
      provider: "mock",
      durationSeconds: existing.durationSeconds ?? 1,
      creditsSpent: 0,
    };
  }

  const profile = input.voiceProfile?.trim() || "warm_narrator";
  const preset = getVoiceProfilePreset(profile);
  const request = buildVoiceRequest({
    script: line,
    voiceProfile: preset.id,
    voiceLanguage: "nl",
    narrationMode: "commercial",
    preset,
  });
  const provider = selectVoiceProvider("mock");
  if (provider.id !== "mock") {
    return fail("paid_provider_disabled", "The mock voice provider was not selected.", 409);
  }
  const spoken = await provider.synthesize({
    request,
    voiceProfile: preset.id,
    voiceLanguage: "nl",
  });
  const dir = localMediaDir();
  if (!dir) return fail("local_media", "Local media storage is not configured for this test.", 500);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `scene-dialogue-${safeLocalFileName(scene.id)}.wav`);
  const rawPath = `${filePath}.raw.wav`;
  await writeFile(rawPath, spoken.audioBuffer);
  const ffmpeg = await resolveFfmpegForTextOverlay();
  await execFileAsync(ffmpeg, ["-y", "-i", rawPath, "-ar", "44100", "-ac", "2", filePath]);
  await rm(rawPath, { force: true });
  const url = pathToFileURL(filePath).href;
  const row = await upsertLibraryAsset({
    ownerId: input.ownerId,
    projectId: project.id,
    family: "voice",
    category: "scene-dialogue",
    title: `${scene.title || "Scene"} dialogue`,
    description: "Mock dialogue. Recorded audio is not replaced.",
    origin: "generated",
    previewUrl: url,
    downloadUrl: url,
    storageKey: filePath,
    mimeType: "audio/wav",
    backingStore: "local_file",
    sourceKind: "scene_dialogue",
    sourceId: scene.id,
    generator: "mock",
    creditsSpent: 0,
    durationSeconds: spoken.durationSeconds,
    language: "nl",
    metadata: { projectId: project.id, sceneId: scene.id, provider: "mock" },
  });
  return {
    assetId: row.id,
    url,
    created: existing == null,
    provider: "mock",
    durationSeconds: spoken.durationSeconds,
    creditsSpent: 0,
  };
}
