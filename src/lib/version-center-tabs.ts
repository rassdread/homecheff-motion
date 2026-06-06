import type {
  AnimationProjectDetailResponse,
  ProjectRenderVersionSummary,
  VideoLanguageExportSummary,
} from "@/types/animation-api";

export type VersionCenterTab =
  | "original"
  | "text"
  | "full_rerender"
  | "languages"
  | "drafts";

export const VERSION_CENTER_TABS: VersionCenterTab[] = [
  "original",
  "text",
  "full_rerender",
  "languages",
  "drafts",
];

export type VersionCenterRow = {
  id: string;
  tab: VersionCenterTab;
  title: string;
  status: string;
  createdAt: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  projectId: string;
  renderVersionId?: string;
  renderVersionNumber?: number;
  languageExportId?: string;
  languageCode?: string;
  kind?: ProjectRenderVersionSummary["kind"];
  href: string;
  canOpenEditor: boolean;
  isDefault?: boolean;
  canRestore?: boolean;
  timelinePrevHref?: string | null;
  timelineNextHref?: string | null;
};

export function versionCenterTabTitleKey(tab: VersionCenterTab): string {
  return `versions.center.tab.${tab}`;
}

export function versionCenterTabIntroKey(tab: VersionCenterTab): string {
  return `versions.center.tabIntro.${tab}`;
}

export function versionCenterStatusLabelKey(status: string): string {
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "completed":
      return "versions.center.status.ready";
    case "failed":
      return "versions.center.status.needsAttention";
    case "running":
    case "rendering":
    case "processing":
    case "queued":
      return "versions.center.status.processing";
    case "cancelled":
      return "versions.center.status.cancelled";
    case "draft":
    case "concept":
      return "versions.center.status.draft";
    default:
      return "versions.center.status.unknown";
  }
}

function projectThumbnail(detail: AnimationProjectDetailResponse): string | null {
  const first = detail.images?.[0];
  return first?.previewUrl?.trim() || null;
}

export function buildVersionCenterRows(
  detail: AnimationProjectDetailResponse
): VersionCenterRow[] {
  const rows: VersionCenterRow[] = [];
  const projectId = detail.id;
  const thumbnailUrl = projectThumbnail(detail);

  for (const version of detail.renderVersions ?? []) {
    const tab = renderVersionTab(version);
    rows.push({
      id: version.id,
      tab,
      title: `V${version.renderVersionNumber}${version.versionNote ? ` — ${version.versionNote}` : ""}`,
      status: version.status,
      createdAt: version.createdAt,
      videoUrl: version.finalVideoUrl ?? version.cleanVideoUrl,
      thumbnailUrl,
      projectId,
      renderVersionId: version.id,
      renderVersionNumber: version.renderVersionNumber,
      kind: version.kind,
      href: `/videos/${projectId}?renderVersionId=${encodeURIComponent(version.id)}`,
      canOpenEditor: version.kind === "text_rerender" || version.kind === "full_rerender",
      isDefault: version.isDefault,
      canRestore: version.status === "completed" && !version.isDefault,
    });
  }

  for (const exp of detail.languageExports ?? []) {
    if (exp.languageCode === "original") {
      continue;
    }
    rows.push({
      id: exp.id,
      tab: "languages",
      title: `${exp.languageLabel} v${exp.version ?? 1}`,
      status: exp.status,
      createdAt: exp.createdAt,
      videoUrl: exp.outputVideoUrl,
      thumbnailUrl,
      projectId,
      languageExportId: exp.id,
      languageCode: exp.languageCode,
      href: `/videos/${projectId}?lang=${encodeURIComponent(exp.languageCode)}&exportId=${encodeURIComponent(exp.id)}`,
      canOpenEditor: false,
    });
  }

  if (detail.draftLineage?.sourceProjectId) {
    rows.push({
      id: `draft-${projectId}`,
      tab: "drafts",
      title: detail.title?.trim() || projectId,
      status: detail.status,
      createdAt: detail.draftCopiedAt ?? detail.createdAt,
      videoUrl: null,
      thumbnailUrl,
      projectId,
      href: `/videos/${projectId}`,
      canOpenEditor: true,
    });
  }

  for (const peer of detail.bundlePeers ?? []) {
    if (peer.id === projectId) {
      continue;
    }
    if (peer.status === "draft" || peer.status === "concept") {
      rows.push({
        id: peer.id,
        tab: "drafts",
        title: peer.title?.trim() || peer.id,
        status: peer.status,
        createdAt: null,
        videoUrl: null,
        thumbnailUrl,
        projectId: peer.id,
        href: `/videos/${peer.id}`,
        canOpenEditor: true,
      });
    }
  }

  if (rows.filter((r) => r.tab === "original").length === 0) {
    const fallbackUrl =
      detail.exports?.find((e) => e.outputVideoUrl)?.outputVideoUrl ??
      detail.instantCleanFinalVideoUrl ??
      null;
    rows.unshift({
      id: `original-${projectId}`,
      tab: "original",
      title: "Original",
      status: detail.status,
      createdAt: detail.createdAt,
      videoUrl: fallbackUrl,
      thumbnailUrl,
      projectId,
      href: `/videos/${projectId}`,
      canOpenEditor: false,
    });
  }

  attachRenderVersionTimeline(rows);
  return rows;
}

function attachRenderVersionTimeline(rows: VersionCenterRow[]): void {
  const renderRows = rows
    .filter((r): r is VersionCenterRow & { renderVersionId: string } => Boolean(r.renderVersionId))
    .sort((a, b) => (a.renderVersionNumber ?? 0) - (b.renderVersionNumber ?? 0));

  for (let i = 0; i < renderRows.length; i += 1) {
    const row = renderRows[i];
    row.timelinePrevHref = i > 0 ? renderRows[i - 1].href : null;
    row.timelineNextHref = i < renderRows.length - 1 ? renderRows[i + 1].href : null;
  }
}

function renderVersionTab(version: ProjectRenderVersionSummary): VersionCenterTab {
  if (version.kind === "text_rerender") {
    return "text";
  }
  if (version.kind === "full_rerender") {
    return "full_rerender";
  }
  return "original";
}

export function rowsForTab(rows: VersionCenterRow[], tab: VersionCenterTab): VersionCenterRow[] {
  return rows.filter((row) => row.tab === tab);
}

export function tabCounts(rows: VersionCenterRow[]): Record<VersionCenterTab, number> {
  return VERSION_CENTER_TABS.reduce(
    (acc, tab) => {
      acc[tab] = rows.filter((r) => r.tab === tab).length;
      return acc;
    },
    {} as Record<VersionCenterTab, number>
  );
}

export function normalizeLanguageExports(
  exports: VideoLanguageExportSummary[] | undefined
): VideoLanguageExportSummary[] {
  return exports ?? [];
}
