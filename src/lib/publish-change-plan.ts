import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";

export type PublishTextRewriteMode =
  | "keep"
  | "improve"
  | "shorten"
  | "summarize"
  | "professional"
  | "commercial"
  | "emotional"
  | "cinematic";

export type PublishTextSegmentPlan = {
  id: string;
  startTime: number;
  endTime: number;
  originalText: string;
  proposedText: string;
  acceptedText: string;
  zoneId?: PublishSafeZoneId;
  rewriteMode?: PublishTextRewriteMode;
  style?: Record<string, unknown>;
};

export type PublishChangePlan = {
  projectId: string;
  segments: PublishTextSegmentPlan[];
  pendingRender: boolean;
  lastEditedAt: string;
};

export function createPublishChangePlan(projectId: string): PublishChangePlan {
  return {
    projectId,
    segments: [],
    pendingRender: false,
    lastEditedAt: new Date().toISOString(),
  };
}

export function upsertPublishSegmentPlan(
  plan: PublishChangePlan,
  segment: PublishTextSegmentPlan
): PublishChangePlan {
  const segments = plan.segments.filter((s) => s.id !== segment.id);
  segments.push(segment);
  return {
    ...plan,
    segments,
    pendingRender: true,
    lastEditedAt: new Date().toISOString(),
  };
}

export function applyTextRewrite(
  text: string,
  mode: PublishTextRewriteMode
): string {
  if (mode === "keep") return text;
  const trimmed = text.trim();
  if (mode === "shorten" || mode === "summarize") {
    const words = trimmed.split(/\s+/);
    return words.slice(0, Math.max(3, Math.ceil(words.length * 0.6))).join(" ");
  }
  if (mode === "improve" || mode === "professional") {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed;
}

export function planHasPendingChanges(plan: PublishChangePlan): boolean {
  return plan.pendingRender && plan.segments.some((s) => s.acceptedText.trim().length > 0);
}
