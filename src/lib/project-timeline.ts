/**
 * Chronological project timeline for Motion detail.
 */

import type { AnimationProjectDetailResponse } from "@/types/animation-api";

export type ProjectTimelineEventKind =
  | "created"
  | "studio_import"
  | "rendered"
  | "text_edit"
  | "language"
  | "full_rerender";

export type ProjectTimelineEvent = {
  id: string;
  kind: ProjectTimelineEventKind;
  labelKey: string;
  params?: Record<string, string | number>;
  at: string;
  href?: string;
};

export function buildProjectTimeline(
  detail: AnimationProjectDetailResponse
): ProjectTimelineEvent[] {
  const events: ProjectTimelineEvent[] = [];

  if (detail.createdAt) {
    events.push({
      id: "created",
      kind: "created",
      labelKey: "studio.aiAssistant.timeline.created",
      at: detail.createdAt,
    });
  }

  if (detail.studioSource?.storyboardId) {
    events.push({
      id: "studio_import",
      kind: "studio_import",
      labelKey: "studio.aiAssistant.timeline.studioImport",
      at: detail.createdAt,
      href: `/studio/storyboards/${detail.studioSource.storyboardId}`,
    });
  }

  const versions = [...(detail.renderVersions ?? [])].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
  );

  for (const v of versions) {
    if (v.kind === "initial") {
      events.push({
        id: `render-${v.id}`,
        kind: "rendered",
        labelKey: "studio.aiAssistant.timeline.rendered",
        params: { version: v.renderVersionNumber },
        at: v.completedAt ?? v.createdAt,
        href: `/videos/${detail.id}?renderVersionId=${encodeURIComponent(v.id)}`,
      });
    } else if (v.kind === "text_rerender") {
      events.push({
        id: `text-${v.id}`,
        kind: "text_edit",
        labelKey: "studio.aiAssistant.timeline.textEdit",
        params: {
          version: v.renderVersionNumber,
          note: v.versionNote?.trim() ?? "",
        },
        at: v.completedAt ?? v.createdAt,
        href: `/videos/${detail.id}?renderVersionId=${encodeURIComponent(v.id)}`,
      });
    } else if (v.kind === "full_rerender") {
      events.push({
        id: `rerender-${v.id}`,
        kind: "full_rerender",
        labelKey: "studio.aiAssistant.timeline.fullRerender",
        params: {
          version: v.renderVersionNumber,
          note: v.versionNote?.trim() ?? "",
        },
        at: v.completedAt ?? v.createdAt,
        href: `/videos/${detail.id}?renderVersionId=${encodeURIComponent(v.id)}`,
      });
    }
  }

  for (const lang of detail.languageExports ?? []) {
    events.push({
      id: `lang-${lang.id}`,
      kind: "language",
      labelKey: "studio.aiAssistant.timeline.language",
      params: { language: (lang.languageCode ?? "").toUpperCase() },
      at: lang.createdAt ?? detail.createdAt,
      href: `/videos/${detail.id}?languageExportId=${encodeURIComponent(lang.id)}`,
    });
  }

  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
