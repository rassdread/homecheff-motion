import { buildEditorReviewSummary } from "@/lib/editor-review";
import { auditEditorPlacements } from "@/lib/editor-placement-qa";
import {
  publishOverlayDurationWarning,
  publishOverlayTextDensityWarning,
  auditOverlaySafeArea,
} from "@/lib/publish-overlay-timeline";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { PublishProject } from "@/types/publish-overlay";

export type QaSeverity = "pass" | "warning" | "needs_attention";

export type QaItem = {
  id: string;
  domain: "editor" | "publish" | "motion" | "library";
  severity: QaSeverity;
  messageKey: string;
  params?: Record<string, string>;
  autoFixable?: boolean;
};

export type QaSummary = {
  items: QaItem[];
  passCount: number;
  warningCount: number;
  needsAttentionCount: number;
  overall: QaSeverity;
};

export type QaActionState = {
  ignoredIds: string[];
  acceptedIds: string[];
};

export function buildEditorQaItems(document: EditorCanvasDocument): QaItem[] {
  const items: QaItem[] = [];
  const review = buildEditorReviewSummary(document);
  if (review.identityScore < 70) {
    items.push({ id: "editor-identity-low", domain: "editor", severity: "warning", messageKey: "qa.editor.identityLow", params: { score: String(review.identityScore) } });
  }
  const placementQa = auditEditorPlacements(document);
  for (const p of placementQa.items) {
    if (p.status !== "pass") {
      items.push({
        id: `editor-placement-${p.placementId}`,
        domain: "editor",
        severity: p.status === "fail" ? "needs_attention" : "warning",
        messageKey: p.messageKey,
      });
    }
  }
  const missingObjects = document.objects.filter((o) => o.layerType === "semantic" && !o.visible);
  if (missingObjects.length > 0) {
    items.push({
      id: "editor-object-hidden",
      domain: "editor",
      severity: "warning",
      messageKey: "qa.editor.objectHidden",
      params: { count: String(missingObjects.length) },
    });
  }
  return items;
}

export function buildPublishQaItems(project: PublishProject): QaItem[] {
  const items: QaItem[] = [];
  for (const o of project.overlays) {
    if (o.safeAreaStatus === "fail" || auditOverlaySafeArea(o, project.platform) === "fail") {
      items.push({ id: `publish-safe-${o.id}`, domain: "publish", severity: "needs_attention", messageKey: "qa.publish.safeArea" });
    } else if (o.safeAreaStatus === "warning") {
      items.push({ id: `publish-safe-warn-${o.id}`, domain: "publish", severity: "warning", messageKey: "qa.publish.safeAreaWarning" });
    }
    if (publishOverlayDurationWarning(o)) {
      items.push({ id: `publish-duration-${o.id}`, domain: "publish", severity: "warning", messageKey: "qa.publish.shortDuration" });
    }
    if (publishOverlayTextDensityWarning(o)) {
      items.push({ id: `publish-density-${o.id}`, domain: "publish", severity: "warning", messageKey: "qa.publish.tooMuchText" });
    }
  }
  for (const s of project.subtitles) {
    if (s.safeAreaStatus !== "ok") {
      items.push({ id: `publish-sub-safe-${s.id}`, domain: "publish", severity: "warning", messageKey: "qa.publish.subtitleEdge" });
    }
  }
  if (!project.overlays.some((o) => o.type === "logo")) {
    items.push({ id: "publish-logo-missing", domain: "publish", severity: "warning", messageKey: "qa.publish.logoMissing" });
  }
  if (!project.overlays.some((o) => o.type === "cta")) {
    items.push({ id: "publish-cta-missing", domain: "publish", severity: "warning", messageKey: "qa.publish.ctaMissing" });
  }
  return items;
}

export function buildLibraryQaItems(params: { identityScore?: number; missingMetadata?: boolean; usedInCount?: number }): QaItem[] {
  const items: QaItem[] = [];
  if (params.identityScore !== undefined && params.identityScore < 60) {
    items.push({ id: "library-identity-badge", domain: "library", severity: "warning", messageKey: "qa.library.lowIdentity", params: { score: String(params.identityScore) } });
  }
  if (params.missingMetadata) {
    items.push({ id: "library-metadata", domain: "library", severity: "needs_attention", messageKey: "qa.library.missingMetadata" });
  }
  if (params.usedInCount && params.usedInCount > 0) {
    items.push({ id: "library-used-in", domain: "library", severity: "warning", messageKey: "qa.library.usedIn", params: { count: String(params.usedInCount) } });
  }
  return items;
}

export function buildMotionQaItems(params: { identityDrift?: boolean; placementGap?: boolean; missingReference?: boolean }): QaItem[] {
  const items: QaItem[] = [];
  if (params.identityDrift) {
    items.push({ id: "motion-identity-drift", domain: "motion", severity: "warning", messageKey: "qa.motion.identityDrift" });
  }
  if (params.placementGap) {
    items.push({ id: "motion-placement-gap", domain: "motion", severity: "warning", messageKey: "qa.motion.placementContinuity" });
  }
  if (params.missingReference) {
    items.push({ id: "motion-missing-ref", domain: "motion", severity: "needs_attention", messageKey: "qa.motion.missingReference" });
  }
  return items;
}

export function summarizeQaItems(items: QaItem[], actionState: QaActionState = { ignoredIds: [], acceptedIds: [] }): QaSummary {
  const active = items.filter((i) => !actionState.ignoredIds.includes(i.id));
  const passCount = active.filter((i) => i.severity === "pass").length;
  const warningCount = active.filter((i) => i.severity === "warning").length;
  const needsAttentionCount = active.filter((i) => i.severity === "needs_attention" && !actionState.acceptedIds.includes(i.id)).length;
  const overall: QaSeverity =
    needsAttentionCount > 0 ? "needs_attention"
    : warningCount > 0 ? "warning"
    : "pass";
  return { items: active, passCount, warningCount, needsAttentionCount, overall };
}

export function applyQaAction(state: QaActionState, itemId: string, action: "ignore" | "accept"): QaActionState {
  if (action === "ignore") {
    return { ...state, ignoredIds: [...state.ignoredIds, itemId] };
  }
  return { ...state, acceptedIds: [...state.acceptedIds, itemId] };
}
