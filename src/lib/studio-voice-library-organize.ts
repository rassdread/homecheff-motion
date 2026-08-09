/**
 * S.7C — Voice library organization buckets.
 * Reuse remains free — organize existing assets, do not regenerate.
 */

export const STUDIO_VOICE_LIBRARY_BUCKETS = [
  "character_voices",
  "narrators",
  "cloned_voices",
  "favorites",
  "recent",
  "project_voices",
  "brand_voices",
  "shared_assets",
] as const;

export type StudioVoiceLibraryBucket = (typeof STUDIO_VOICE_LIBRARY_BUCKETS)[number];

export type StudioVoiceLibraryEntry = {
  id: string;
  bucket: StudioVoiceLibraryBucket;
  label: string;
  voiceProfileRef: string | null;
  characterId: string | null;
  language: string | null;
  /** Reuse ≠ regeneration */
  reuseWithoutCharge: true;
};

export function classifyVoiceLibraryBucket(input: {
  isClone?: boolean;
  isCharacterLinked?: boolean;
  isNarrator?: boolean;
  isFavorite?: boolean;
  isRecent?: boolean;
  isProjectScoped?: boolean;
  isBrand?: boolean;
  isShared?: boolean;
}): StudioVoiceLibraryBucket {
  if (input.isBrand) return "brand_voices";
  if (input.isShared) return "shared_assets";
  if (input.isClone) return "cloned_voices";
  if (input.isCharacterLinked) return "character_voices";
  if (input.isNarrator) return "narrators";
  if (input.isFavorite) return "favorites";
  if (input.isRecent) return "recent";
  if (input.isProjectScoped) return "project_voices";
  return "character_voices";
}

export function organizeVoiceLibraryEntries(
  entries: Array<Omit<StudioVoiceLibraryEntry, "bucket" | "reuseWithoutCharge"> & {
    bucketHint?: Partial<{
      isClone: boolean;
      isCharacterLinked: boolean;
      isNarrator: boolean;
      isFavorite: boolean;
      isRecent: boolean;
      isProjectScoped: boolean;
      isBrand: boolean;
      isShared: boolean;
    }>;
  }>
): StudioVoiceLibraryEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    voiceProfileRef: entry.voiceProfileRef,
    characterId: entry.characterId,
    language: entry.language,
    bucket: classifyVoiceLibraryBucket(entry.bucketHint ?? {}),
    reuseWithoutCharge: true,
  }));
}
