import {
  estimateLibraryAudioDurationSeconds,
  validateStudioLibraryAudioUpload,
} from "@/lib/studio-audio-library-validation";
import {
  listUserAudioLibraryAssets,
  uploadUserAudioLibraryAsset,
} from "@/server/studio/studio-user-audio-library-blob";
import type { SessionUser } from "@/server/auth/session";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import type {
  UserAudioEnergy,
  UserAudioLibraryAsset,
  UserAudioLibraryAssetKind,
} from "@/types/studio-user-audio-library";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

function normalizeEnergy(value: string | undefined): UserAudioEnergy {
  const v = (value ?? "medium").trim().toLowerCase();
  if (v === "low" || v === "high") {
    return v;
  }
  return "medium";
}

export async function getOwnerAudioLibrary(
  ownerId: string
): Promise<UserAudioLibraryAsset[]> {
  return listUserAudioLibraryAssets(ownerId);
}

export async function uploadOwnerAudioLibraryAsset(params: {
  viewer: Pick<SessionUser, "id" | "role">;
  ownerId: string;
  kind: UserAudioLibraryAssetKind;
  name: string;
  category: string;
  mood: string;
  energy?: string;
  audioBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
}): Promise<{ ok: true; asset: UserAudioLibraryAsset } | { error: ServiceError }> {
  if (params.viewer.id !== params.ownerId && params.viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const validation = validateStudioLibraryAudioUpload({
    buffer: params.audioBuffer,
    fileName: params.fileName,
    mimeType: params.mimeType,
  });
  if (!validation.ok) {
    return { error: serviceError(validation.code, validation.message, 400) };
  }

  try {
    const asset = await uploadUserAudioLibraryAsset({
      ownerId: params.ownerId,
      kind: params.kind,
      name: params.name,
      category: params.category,
      mood: params.mood,
      energy: normalizeEnergy(params.energy),
      audioBuffer: params.audioBuffer,
      contentType: validation.contentType,
      extension: validation.extension,
      durationSeconds: estimateLibraryAudioDurationSeconds(
        params.audioBuffer,
        validation.extension
      ),
    });
    return { ok: true, asset };
  } catch {
    return {
      error: serviceError("UPLOAD_FAILED", "Could not upload audio. Try again.", 502),
    };
  }
}
