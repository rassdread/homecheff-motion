import { readMotionAudioExportFromHandoffJson } from "@/lib/motion-voice-export";
import type { MotionVersionSlot } from "@/lib/motion-version-catalog";

export type BundleVersionBadgeId =
  | "studio"
  | "motion"
  | "story_mode"
  | "transition_mode"
  | "multi_image"
  | "voice"
  | "subtitles"
  | "text_only"
  | "legacy"
  | "failed"
  | "test"
  | "archived";

export type BundleVersionBadge = {
  id: BundleVersionBadgeId;
  labelKey: string;
};

export type BundleVersionBadgeContext = {
  studioSourceStoryboardId?: string | null;
  hasStudioHandoff?: boolean;
  instantMode?: string | null;
  imageCount?: number;
  status?: string;
  slotKind?: MotionVersionSlot["kind"];
  isLegacyProject?: boolean;
  folderId?: string;
};

export function resolveBundleVersionBadges(
  ctx: BundleVersionBadgeContext,
  handoffJson?: unknown
): BundleVersionBadge[] {
  const badges: BundleVersionBadge[] = [];
  const status = (ctx.status ?? "").toLowerCase();
  const instantMode = (ctx.instantMode ?? "transition").toLowerCase();
  const isStudio = Boolean(
    ctx.studioSourceStoryboardId?.trim() || ctx.hasStudioHandoff
  );

  if (ctx.folderId === "tests") {
    badges.push({ id: "test", labelKey: "videos.badge.test" });
  }
  if (ctx.folderId === "archive") {
    badges.push({ id: "archived", labelKey: "videos.badge.archived" });
  }

  if (status === "failed") {
    badges.push({ id: "failed", labelKey: "videos.badge.failed" });
  }

  if (isStudio) {
    badges.push({ id: "studio", labelKey: "videos.badge.studio" });
  } else {
    badges.push({ id: "motion", labelKey: "videos.badge.motion" });
  }

  if (instantMode === "story") {
    badges.push({ id: "story_mode", labelKey: "videos.badge.storyMode" });
    if ((ctx.imageCount ?? 0) > 1) {
      badges.push({ id: "multi_image", labelKey: "videos.badge.multiImage" });
    }
  } else if (instantMode === "transition") {
    badges.push({ id: "transition_mode", labelKey: "videos.badge.transitionMode" });
  }

  const audioExport = handoffJson ? readMotionAudioExportFromHandoffJson(handoffJson) : null;
  if (audioExport?.voiceAudioUrl?.trim()) {
    badges.push({ id: "voice", labelKey: "videos.badge.voice" });
  }
  if (audioExport?.subtitleTrack?.entries?.length) {
    badges.push({ id: "subtitles", labelKey: "videos.badge.subtitles" });
  }

  if (ctx.slotKind === "language_export") {
    badges.push({ id: "text_only", labelKey: "videos.badge.textOnly" });
  }

  if (ctx.isLegacyProject) {
    badges.push({ id: "legacy", labelKey: "videos.badge.legacy" });
  }

  return dedupeBadges(badges);
}

function dedupeBadges(badges: BundleVersionBadge[]): BundleVersionBadge[] {
  const seen = new Set<string>();
  return badges.filter((b) => {
    if (seen.has(b.id)) {
      return false;
    }
    seen.add(b.id);
    return true;
  });
}

export function badgeContextForProject(row: {
  id: string;
  studioSourceStoryboardId?: string | null;
  studioHandoffJson?: unknown;
  hasStudioHandoff?: boolean;
  instantMode?: string | null;
  imageCount?: number;
  status?: string;
  renderVersionCount?: number;
  languageExportCount?: number;
  folderId?: string;
}): BundleVersionBadgeContext {
  const hasHandoff =
    row.hasStudioHandoff ??
    (row.studioHandoffJson != null &&
      typeof row.studioHandoffJson === "object" &&
      Object.keys(row.studioHandoffJson as object).length > 0);
  return {
    studioSourceStoryboardId: row.studioSourceStoryboardId,
    hasStudioHandoff: hasHandoff,
    instantMode: row.instantMode,
    imageCount: row.imageCount,
    status: row.status,
    isLegacyProject:
      (row.renderVersionCount ?? 0) === 0 && (row.languageExportCount ?? 0) === 0,
    folderId: row.folderId,
  };
}
