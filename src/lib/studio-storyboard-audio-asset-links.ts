import type { StoryboardAudioAssetLinks } from "@/types/studio-user-audio-library";

export function parseStoryboardAudioAssetLinks(raw: unknown): StoryboardAudioAssetLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { version: 1 };
  }
  const row = raw as Record<string, unknown>;
  return {
    version: 1,
    musicAssetId:
      typeof row.musicAssetId === "string" ? row.musicAssetId.trim() || null : null,
    soundAssetId:
      typeof row.soundAssetId === "string" ? row.soundAssetId.trim() || null : null,
    linkedAt: typeof row.linkedAt === "string" ? row.linkedAt : undefined,
  };
}

export function serializeStoryboardAudioAssetLinks(
  links: StoryboardAudioAssetLinks
): StoryboardAudioAssetLinks {
  return {
    version: 1,
    musicAssetId: links.musicAssetId?.trim() || null,
    soundAssetId: links.soundAssetId?.trim() || null,
    linkedAt: links.linkedAt,
  };
}
