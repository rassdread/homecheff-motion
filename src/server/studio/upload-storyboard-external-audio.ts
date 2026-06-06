import { randomUUID } from "node:crypto";
import {
  estimateUploadedAudioDurationSeconds,
  validateStudioAudioUpload,
} from "@/lib/studio-audio-upload-validation";
import { STORYBOARD_AUDIO_UPLOAD_PROVIDER } from "@/lib/studio-storyboard-audio";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import { uploadStoryboardVoiceAudio } from "@/server/studio/studio-voice-blob";
import {
  isStudioVoiceExecutionLanguage,
  type StudioVoiceExecutionLanguage,
} from "@/types/studio-voice-execution";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type UploadStoryboardExternalAudioResult = {
  voiceId: string;
  audioUrl: string;
  durationSeconds: number;
  displayName: string;
  language: string;
};

export async function uploadStoryboardExternalAudio(params: {
  storyboardId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  audioBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
  displayName?: string;
  language?: string;
}): Promise<
  { ok: true; data: UploadStoryboardExternalAudioResult } | { error: ServiceError }
> {
  const validation = validateStudioAudioUpload({
    buffer: params.audioBuffer,
    fileName: params.fileName,
    mimeType: params.mimeType,
  });
  if (!validation.ok) {
    return { error: serviceError(validation.code, validation.message, 400) };
  }

  const storyboard = await getStudioStoryboardById(params.storyboardId, params.viewer);
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (storyboard.ownerId !== params.viewer.id && params.viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const languageRaw = (params.language ?? storyboard.voiceLanguage ?? "en")
    .trim()
    .toLowerCase()
    .slice(0, 2);
  const language: StudioVoiceExecutionLanguage = isStudioVoiceExecutionLanguage(languageRaw)
    ? languageRaw
    : "en";

  const voiceAssetId = randomUUID();
  let uploaded: { audioUrl: string; storageKey: string };
  try {
    uploaded = await uploadStoryboardVoiceAudio({
      ownerId: storyboard.ownerId,
      storyboardId: storyboard.id,
      language,
      voiceAssetId,
      audioBuffer: params.audioBuffer,
      contentType: validation.contentType,
      extension: validation.extension,
    });
  } catch {
    return {
      error: serviceError("UPLOAD_FAILED", "Could not upload audio. Try again.", 502),
    };
  }

  const durationSeconds = estimateUploadedAudioDurationSeconds(
    params.audioBuffer,
    validation.extension
  );
  const displayName =
    params.displayName?.trim()
    || params.fileName?.replace(/\.[^.]+$/, "")?.trim()
    || "Uploaded audio";
  const uploadedAt = new Date().toISOString();

  const voiceRow = await prisma.studioStoryboardVoice.upsert({
    where: {
      storyboardId_language: { storyboardId: storyboard.id, language },
    },
    create: {
      storyboardId: storyboard.id,
      language,
      provider: STORYBOARD_AUDIO_UPLOAD_PROVIDER,
      voiceProfile: "external",
      voiceStyle: "",
      audioUrl: uploaded.audioUrl,
      storageKey: uploaded.storageKey,
      durationSeconds,
      status: "completed",
      providerMetadata: {
        source: "upload",
        displayName,
        fileName: params.fileName ?? "",
        uploadedAt,
      },
      generatedAt: new Date(),
    },
    update: {
      provider: STORYBOARD_AUDIO_UPLOAD_PROVIDER,
      voiceProfile: "external",
      audioUrl: uploaded.audioUrl,
      storageKey: uploaded.storageKey,
      durationSeconds,
      status: "completed",
      errorMessage: "",
      providerMetadata: {
        source: "upload",
        displayName,
        fileName: params.fileName ?? "",
        uploadedAt,
      },
      generatedAt: new Date(),
    },
  });

  if (!storyboard.voiceEnabled) {
    await prisma.studioStoryboard.update({
      where: { id: storyboard.id },
      data: { voiceEnabled: true },
    });
  }

  return {
    ok: true,
    data: {
      voiceId: voiceRow.id,
      audioUrl: uploaded.audioUrl,
      durationSeconds,
      displayName,
      language,
    },
  };
}
