import { prisma } from "@/lib/prisma";
import {
  parseStoryboardAudioAssetLinks,
  serializeStoryboardAudioAssetLinks,
} from "@/lib/studio-storyboard-audio-asset-links";
import { findUserAudioLibraryAsset, listUserAudioLibraryAssets } from "@/server/studio/studio-user-audio-library-blob";
import type { SessionUser } from "@/server/auth/session";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import type { StoryboardAudioAssetLinks } from "@/types/studio-user-audio-library";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export async function linkStoryboardAudioAssets(params: {
  storyboardId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  musicAssetId?: string | null;
  soundAssetId?: string | null;
}): Promise<
  { ok: true; links: StoryboardAudioAssetLinks } | { error: ServiceError }
> {
  const storyboard = await getStudioStoryboardById(params.storyboardId, params.viewer);
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (storyboard.ownerId !== params.viewer.id && params.viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const library = await listUserAudioLibraryAssets(storyboard.ownerId);
  if (params.musicAssetId) {
    const asset = findUserAudioLibraryAsset(library, params.musicAssetId);
    if (!asset || asset.kind !== "music") {
      return { error: serviceError("INVALID_MUSIC_ASSET", "Music asset not found.", 400) };
    }
  }
  if (params.soundAssetId) {
    const asset = findUserAudioLibraryAsset(library, params.soundAssetId);
    if (!asset || asset.kind !== "sfx") {
      return { error: serviceError("INVALID_SOUND_ASSET", "Sound asset not found.", 400) };
    }
  }

  const links = serializeStoryboardAudioAssetLinks({
    version: 1,
    musicAssetId: params.musicAssetId ?? null,
    soundAssetId: params.soundAssetId ?? null,
    linkedAt: new Date().toISOString(),
  });

  await prisma.studioStoryboard.update({
    where: { id: storyboard.id },
    data: { audioAssetMetadataJson: links },
  });

  return { ok: true, links };
}

export async function readStoryboardAudioAssetLinks(
  storyboardId: string
): Promise<StoryboardAudioAssetLinks> {
  const row = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    select: { audioAssetMetadataJson: true },
  });
  return parseStoryboardAudioAssetLinks(row?.audioAssetMetadataJson);
}
