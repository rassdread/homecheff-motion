/** User-uploaded music & SFX library (Blob manifest — no extra Prisma table). */

export const USER_SFX_CATEGORIES = [
  "ambience",
  "transition",
  "impact",
  "whoosh",
  "crowd",
  "city",
  "nature",
  "custom",
] as const;

export type UserSfxCategory = (typeof USER_SFX_CATEGORIES)[number];

export const USER_MUSIC_MOODS = [
  "warm",
  "neutral",
  "energetic",
  "cinematic",
  "corporate",
  "calm",
] as const;

export type UserMusicMood = (typeof USER_MUSIC_MOODS)[number];

export const USER_AUDIO_ENERGY_LEVELS = ["low", "medium", "high"] as const;

export type UserAudioEnergy = (typeof USER_AUDIO_ENERGY_LEVELS)[number];

export type UserAudioLibraryAssetKind = "music" | "sfx";

export type UserAudioLibraryAsset = {
  id: string;
  kind: UserAudioLibraryAssetKind;
  name: string;
  /** Music: mood/style. SFX: category from USER_SFX_CATEGORIES. */
  category: string;
  mood: string;
  energy: UserAudioEnergy;
  audioUrl: string;
  storageKey: string;
  durationSeconds: number;
  createdAt: string;
};

export type UserAudioLibraryManifest = {
  version: 1;
  ownerId: string;
  updatedAt: string;
  assets: UserAudioLibraryAsset[];
};

export type StoryboardAudioAssetLinks = {
  version: 1;
  musicAssetId?: string | null;
  soundAssetId?: string | null;
  linkedAt?: string;
};
