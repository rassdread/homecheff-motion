/**
 * PX.4A.6.4 music catalog seam.
 *
 * Product: Eigen muziek stays on PhotoVideoAudio `{ kind: "ownMusic" }`.
 * Future: `{ kind: "catalog", trackId, startSeconds, durationSeconds, trackDurationSeconds, volume }`
 * can reuse the same window helpers in export-audio.ts once a class-C license is confirmed
 * (HomeCheff may host and redistribute the track inside the editor).
 *
 * This phase ships zero tracks. Catalog UI shows empty copy only.
 */

export const PHOTO_VIDEO_MUSIC_MOODS = ["calm", "warm", "upbeat", "neutral"] as const;
export type PhotoVideoMusicMood = (typeof PHOTO_VIDEO_MUSIC_MOODS)[number];

export type PhotoVideoCatalogLicense = "cc0" | "cc-by" | "hosted-permission";

export type PhotoVideoCatalogTrack = {
  id: string;
  title: string;
  artist: string;
  mood: PhotoVideoMusicMood;
  durationSeconds: number;
  license: PhotoVideoCatalogLicense;
  attribution?: string;
};

export const PHOTO_VIDEO_CATALOG_TRACKS: readonly PhotoVideoCatalogTrack[] = [];

export const PHOTO_VIDEO_MUSIC_CATALOG_STATUS = "empty" as const;

export function photoVideoCatalogTrackById(id: string): PhotoVideoCatalogTrack | null {
  return PHOTO_VIDEO_CATALOG_TRACKS.find((track) => track.id === id) ?? null;
}
