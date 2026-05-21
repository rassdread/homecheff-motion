/**
 * Single source of truth for final video playback / download URLs (cache-busted).
 */

import {
  resolvePublicFinalVideoUrl,
  withFinalVideoCacheBust,
} from "@/lib/final-video-storage";

export const STALE_PLAYBACK_URL = "STALE_PLAYBACK_URL";

export type PlaybackUrlSource = "detail_export" | "status_snapshot" | "language_export" | "none";

export type ProjectPlaybackFields = {
  status: string;
  instantFinalRebuildCount: number;
  instantFinalRebuiltAt: Date | string | null;
  instantPreviousFinalVideoUrl: string | null;
  instantFinalRebuildStatus: string | null;
};

export type LatestExportPlaybackFields = {
  id: string;
  status: string;
  outputVideoUrl: string | null;
  updatedAt: Date | string;
  createdAt?: Date | string;
};

export function parseCacheBustFromUrl(url: string): { v: number; t: number } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { v: 0, t: 0 };
  }
  try {
    const parsed = new URL(trimmed);
    const v = Number.parseInt(parsed.searchParams.get("v") ?? "0", 10);
    const t = Number.parseInt(parsed.searchParams.get("t") ?? "0", 10);
    return {
      v: Number.isFinite(v) ? v : 0,
      t: Number.isFinite(t) ? t : 0,
    };
  } catch {
    const vMatch = /[?&]v=(\d+)/.exec(trimmed);
    const tMatch = /[?&]t=(\d+)/.exec(trimmed);
    return {
      v: vMatch ? Number.parseInt(vMatch[1]!, 10) : 0,
      t: tMatch ? Number.parseInt(tMatch[1]!, 10) : 0,
    };
  }
}

export function stripUrlCacheParams(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.delete("v");
    parsed.searchParams.delete("t");
    return parsed.toString();
  } catch {
    return trimmed.replace(/([?&])(v|t)=[^&]*/g, "").replace(/\?$/, "");
  }
}

export function urlsReferToSameAsset(a: string, b: string): boolean {
  const sa = stripUrlCacheParams(a);
  const sb = stripUrlCacheParams(b);
  return sa.length > 0 && sa === sb;
}

export function resolveLatestExportPlaybackUrl(
  project: ProjectPlaybackFields,
  latestExport: LatestExportPlaybackFields | null | undefined
): string | null {
  if (!latestExport?.outputVideoUrl?.trim()) {
    return null;
  }
  return resolvePublicFinalVideoUrl({
    outputVideoUrl: latestExport.outputVideoUrl,
    exportStatus: latestExport.status,
    projectStatus: project.status,
    rebuildStatus: project.instantFinalRebuildStatus,
    rebuildCount: project.instantFinalRebuildCount,
    rebuiltAt: project.instantFinalRebuiltAt,
  });
}

/** Prefer detail export URL over status snapshot when both exist (avoids stale cached snapshot). */
export function pickPlaybackUrl(params: {
  detailExportUrl: string | null | undefined;
  statusSnapshotUrl: string | null | undefined;
  previousFinalVideoUrl?: string | null;
}): { url: string | null; source: PlaybackUrlSource } {
  const detail = params.detailExportUrl?.trim() || null;
  const snapshot = params.statusSnapshotUrl?.trim() || null;
  const previous = params.previousFinalVideoUrl?.trim() || null;

  if (!detail && !snapshot) {
    return { url: null, source: "none" };
  }
  if (!detail) {
    return { url: snapshot, source: "status_snapshot" };
  }
  if (!snapshot) {
    return { url: detail, source: "detail_export" };
  }

  if (
    previous &&
    urlsReferToSameAsset(snapshot, previous) &&
    !urlsReferToSameAsset(detail, previous)
  ) {
    return { url: detail, source: "detail_export" };
  }

  const detailBust = parseCacheBustFromUrl(detail);
  const snapBust = parseCacheBustFromUrl(snapshot);
  if (detailBust.v > snapBust.v) {
    return { url: detail, source: "detail_export" };
  }
  if (snapBust.v > detailBust.v) {
    return { url: snapshot, source: "status_snapshot" };
  }
  if (detailBust.t >= snapBust.t) {
    return { url: detail, source: "detail_export" };
  }
  return { url: snapshot, source: "status_snapshot" };
}

export function buildPlaybackCacheKey(url: string | null): string {
  if (!url?.trim()) {
    return "none";
  }
  const { v, t } = parseCacheBustFromUrl(url);
  return `v${v}-t${t}`;
}

/** True when UI would still point at the previous final blob after a successful rebuild. */
export function isStaleSelectedPlaybackAfterRebuild(params: {
  selectedPlaybackUrl: string;
  previousRawUrl: string | null;
  rebuildCount: number;
}): boolean {
  if (!params.previousRawUrl?.trim() || params.rebuildCount <= 0) {
    return false;
  }
  return urlsReferToSameAsset(params.selectedPlaybackUrl, params.previousRawUrl);
}

export function assertPlaybackUrlFreshAfterRebuild(params: {
  projectId: string;
  newRawUrl: string;
  previousRawUrl: string | null;
  rebuildCount: number;
  exportId: string;
}): { ok: true } | { ok: false; code: typeof STALE_PLAYBACK_URL; message: string } {
  const resolved = withFinalVideoCacheBust(
    params.newRawUrl,
    params.rebuildCount,
    new Date()
  );
  if (
    params.previousRawUrl &&
    urlsReferToSameAsset(resolved, params.previousRawUrl) &&
    params.rebuildCount > 0
  ) {
    console.warn("[playback-url-updated]", {
      projectId: params.projectId,
      warning: STALE_PLAYBACK_URL,
      oldUrl: params.previousRawUrl,
      newUrl: params.newRawUrl,
      resolvedPlaybackUrl: resolved,
      rebuildCount: params.rebuildCount,
      exportId: params.exportId,
      note: "new_export_same_blob_as_previous",
    });
    return {
      ok: false,
      code: STALE_PLAYBACK_URL,
      message: `[${params.projectId}] Rebuild completed but output URL matches previous final (${STALE_PLAYBACK_URL}).`,
    };
  }
  return { ok: true };
}

export function logPlaybackUrlUpdated(params: {
  projectId: string;
  oldUrl: string | null;
  newUrl: string;
  rebuildCount: number;
  exportId: string;
  resolvedPlaybackUrl: string;
}): void {
  console.info("[playback-url-updated]", {
    projectId: params.projectId,
    oldUrl: params.oldUrl,
    newUrl: params.newUrl,
    rebuildCount: params.rebuildCount,
    exportId: params.exportId,
    resolvedPlaybackUrl: params.resolvedPlaybackUrl,
  });
}
