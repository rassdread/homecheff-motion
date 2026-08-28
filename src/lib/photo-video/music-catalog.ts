/**
 * PX.4A.6.4 + Free Music Phase 3 catalog seam.
 *
 * Catalog stays empty while public/pilot flags are OFF (default).
 * Own music remains PhotoVideoAudio `{ kind: "ownMusic" }`.
 * Catalog selection uses `{ kind: "catalog", trackId, ... }` when enabled.
 */

import { isStudioFreeMusicCatalogEnabled } from "@/lib/free-music/flag";
import { listPublicFreeMusicCatalog } from "@/lib/free-music/registry";

export const PHOTO_VIDEO_MUSIC_MOODS = ["calm", "warm", "upbeat", "neutral"] as const;
export type PhotoVideoMusicMood = (typeof PHOTO_VIDEO_MUSIC_MOODS)[number];

export type PhotoVideoCatalogLicense = "cc0" | "cc-by" | "hosted-permission" | "pd-recording";

export type PhotoVideoCatalogTrack = {
  id: string;
  title: string;
  artist: string;
  mood: PhotoVideoMusicMood;
  durationSeconds: number;
  license: PhotoVideoCatalogLicense;
  attribution?: string;
  category?: string | null;
  attributionRequired?: boolean;
};

function mapLicense(display: string): PhotoVideoCatalogLicense {
  const d = display.toLowerCase();
  if (d.includes("cc0")) return "cc0";
  if (d.includes("public domain")) return "pd-recording";
  if (d.includes("by")) return "cc-by";
  return "cc0";
}

function moodFrom(raw: string | null): PhotoVideoMusicMood {
  if (raw === "calm" || raw === "warm" || raw === "upbeat" || raw === "neutral") return raw;
  return "neutral";
}

/** Public selectable tracks — empty unless kill switch / pilot is ON for process. */
export function getPhotoVideoCatalogTracks(): readonly PhotoVideoCatalogTrack[] {
  if (!isStudioFreeMusicCatalogEnabled()) {
    // Pilot users still load via API with session; client constant stays empty until flag ON.
    // Browser fetches /api/studio/free-music/catalog which applies per-user pilot gate.
  }
  return listPublicFreeMusicCatalog().map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    mood: moodFrom(t.mood),
    durationSeconds: t.durationSeconds || 1,
    license: mapLicense(t.licenseDisplay),
    attribution: t.attributionRequired ? "Attribution required" : undefined,
    category: t.category,
    attributionRequired: t.attributionRequired,
  }));
}

export const PHOTO_VIDEO_CATALOG_TRACKS: readonly PhotoVideoCatalogTrack[] = [];

export type PhotoVideoMusicCatalogStatus = "empty" | "dormant" | "ready";

/**
 * UI gate for Free Music chip.
 * Client cannot know pilot allowlist without session — use "ready" when public flag ON,
 * else keep empty (composer may still open browser after API says enabled).
 * Phase 3: composer uses client-side `catalogAvailable` from API when pilot.
 */
export function getPhotoVideoMusicCatalogStatus(): PhotoVideoMusicCatalogStatus {
  if (isStudioFreeMusicCatalogEnabled()) {
    return getPhotoVideoCatalogTracks().length > 0 ? "ready" : "empty";
  }
  return "empty";
}

/** @deprecated Prefer live status; constant kept for layout tests expecting empty default. */
export const PHOTO_VIDEO_MUSIC_CATALOG_STATUS = "empty" as const;

export function photoVideoCatalogTrackById(id: string): PhotoVideoCatalogTrack | null {
  return getPhotoVideoCatalogTracks().find((track) => track.id === id) ?? null;
}
