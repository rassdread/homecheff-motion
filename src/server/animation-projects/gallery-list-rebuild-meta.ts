import { DEFAULT_POSTER_MOTION_SETTINGS } from "@/lib/poster-motion-preserve";
import type { GalleryListPrismaRow } from "@/server/animation-projects/gallery-list";

export type GalleryRebuildMeta = {
  rebuildCount: number;
  rebuildStatus: string | null;
  rebuiltAt: Date | null;
  previousFinalVideoUrl: string | null;
};

export function normalizeGalleryRebuildMeta(row: GalleryListPrismaRow): GalleryRebuildMeta {
  const count = row.instantFinalRebuildCount;
  return {
    rebuildCount: typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0,
    rebuildStatus:
      typeof row.instantFinalRebuildStatus === "string"
        ? row.instantFinalRebuildStatus
        : null,
    rebuiltAt: row.instantFinalRebuiltAt instanceof Date ? row.instantFinalRebuiltAt : null,
    previousFinalVideoUrl: null,
  };
}

/** Safe defaults when poster/rebuild JSON columns are absent on legacy rows. */
export function defaultPosterMotionSettingsForList(): typeof DEFAULT_POSTER_MOTION_SETTINGS {
  return { ...DEFAULT_POSTER_MOTION_SETTINGS };
}
