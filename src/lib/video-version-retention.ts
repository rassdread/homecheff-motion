/**
 * URLs that must not be deleted by storage cleanup while still referenced in version history.
 */

import { parseFinalVideoRebuildAuditJson } from "@/lib/final-video-storage";
import { stripUrlCacheParams } from "@/lib/playback-url-resolution";

export type VersionHistoryUrlSource = {
  instantPreviousFinalVideoUrl?: string | null;
  instantFinalRebuildAuditJson?: unknown;
  renderVersions?: Array<{
    finalVideoUrl?: string | null;
    cleanVideoUrl?: string | null;
  }>;
};

function normalizeUrlKey(url: string | null | undefined): string | null {
  const stripped = stripUrlCacheParams(url?.trim() ?? "");
  return stripped.length > 0 ? stripped : null;
}

export function collectVersionHistoryVideoUrls(source: VersionHistoryUrlSource): string[] {
  const keys = new Set<string>();

  const push = (url: string | null | undefined) => {
    const key = normalizeUrlKey(url);
    if (key) {
      keys.add(key);
    }
  };

  push(source.instantPreviousFinalVideoUrl);

  for (const row of source.renderVersions ?? []) {
    push(row.finalVideoUrl);
    push(row.cleanVideoUrl);
  }

  for (const event of parseFinalVideoRebuildAuditJson(source.instantFinalRebuildAuditJson)) {
    push(event.previousFinalVideoUrl);
    push(event.newFinalVideoUrl);
    push(event.rebuildCandidateVideoUrl);
  }

  const audit = source.instantFinalRebuildAuditJson;
  if (audit && typeof audit === "object" && !Array.isArray(audit)) {
    const last = (audit as { lastFullRerender?: { finalVideoUrl?: string; previousFinalVideoUrl?: string } })
      .lastFullRerender;
    push(last?.finalVideoUrl);
    push(last?.previousFinalVideoUrl);
  }

  return [...keys];
}

export function isVideoUrlReferencedByVersionHistory(
  url: string | null | undefined,
  source: VersionHistoryUrlSource
): boolean {
  const key = normalizeUrlKey(url);
  if (!key) {
    return false;
  }
  return collectVersionHistoryVideoUrls(source).includes(key);
}
