/** Blob path + cache-bust helpers for Instant Premium final exports. */

export function finalBlobPathname(projectId: string, rebuildVersion = 0): string {
  if (rebuildVersion <= 0) {
    return `motion/final/${projectId}/final.mp4`;
  }
  return `motion/final/${projectId}/final-v${rebuildVersion}.mp4`;
}

/** Append cache-bust query so players refetch after rebuild. */
export function resolvePublicFinalVideoUrl(params: {
  outputVideoUrl: string | null | undefined;
  exportStatus: string | null | undefined;
  projectStatus: string;
  rebuildStatus: string | null | undefined;
  rebuildCount: number;
  rebuiltAt?: Date | string | null;
}): string | null {
  const raw = params.outputVideoUrl?.trim();
  if (!raw) {
    return null;
  }
  const exportCompleted = params.exportStatus === "completed";
  const showDuringRebuild =
    params.rebuildStatus === "running" && params.projectStatus === "rendering";
  if (!exportCompleted && !showDuringRebuild) {
    return null;
  }
  return withFinalVideoCacheBust(raw, params.rebuildCount, params.rebuiltAt);
}

export function withFinalVideoCacheBust(url: string, rebuildCount: number, rebuiltAt?: Date | string | null): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.set("v", String(rebuildCount));
    if (rebuiltAt) {
      const ts =
        rebuiltAt instanceof Date
          ? rebuiltAt.getTime()
          : new Date(rebuiltAt).getTime();
      if (Number.isFinite(ts)) {
        parsed.searchParams.set("t", String(ts));
      }
    }
    return parsed.toString();
  } catch {
    const sep = trimmed.includes("?") ? "&" : "?";
    const t =
      rebuiltAt != null
        ? `&t=${rebuiltAt instanceof Date ? rebuiltAt.getTime() : new Date(rebuiltAt).getTime()}`
        : "";
    return `${trimmed}${sep}v=${rebuildCount}${t}`;
  }
}

export type FinalVideoRebuildAuditEvent = {
  type: "final_video_rebuild";
  billingImpact: "none";
  aiCreditsUsed: 0;
  provider: "internal_merge";
  source: "existing_segments";
  rebuildType: "merge_only";
  usedExistingSegments: true;
  newProviderJobsCreated: false;
  estimatedAdditionalAiCost: 0;
  projectId: string;
  segmentCount: number;
  rebuildCount: number;
  previousFinalVideoUrl: string | null;
  newFinalVideoUrl: string | null;
  recordedAt: string;
  status: "started" | "completed" | "failed";
};

export function parseFinalVideoRebuildAuditJson(
  value: unknown
): FinalVideoRebuildAuditEvent[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const events = (value as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    return [];
  }
  return events.filter(
    (e): e is FinalVideoRebuildAuditEvent =>
      Boolean(e) &&
      typeof e === "object" &&
      (e as FinalVideoRebuildAuditEvent).type === "final_video_rebuild"
  );
}

export function appendFinalVideoRebuildAudit(
  existing: unknown,
  event: FinalVideoRebuildAuditEvent
): { events: FinalVideoRebuildAuditEvent[] } {
  const prior = parseFinalVideoRebuildAuditJson(existing);
  return { events: [...prior, event] };
}
