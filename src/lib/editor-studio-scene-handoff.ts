import { activeApprovedVariant } from "@/lib/editor-instruction-approval";

/** Studio scene handoff — asset only, no animation generation. */
export function buildStudioSceneHandoffUrl(input: {
  editorSessionId: string;
  variantId?: string;
  resultUrl?: string;
  packageId?: string;
}): string {
  const params = new URLSearchParams({
    editorSession: input.editorSessionId,
    handoffMode: "scene_only",
    sceneAsset: "1",
  });
  if (input.variantId) {
    params.set("editorVariantId", input.variantId);
  }
  if (input.resultUrl) {
    params.set("sceneImageUrl", input.resultUrl);
  }
  if (input.packageId) {
    params.set("generationPackage", input.packageId);
  }
  return `/studio/storyboards/new?${params.toString()}`;
}

export function buildMotionAnimateUrl(input: {
  editorSessionId: string;
  durationSec: 3 | 5 | 8;
  resultUrl?: string;
  orderedFrameUrls?: string[];
  packageId?: string;
}): string {
  const params = new URLSearchParams({
    editorSession: input.editorSessionId,
    motionIntent: "animate_now",
    transitionDurationSec: String(input.durationSec),
    handoffMode: "animation",
  });
  if (input.resultUrl) {
    params.set("sourceImage", input.resultUrl);
  }
  if (input.packageId) {
    params.set("generationPackage", input.packageId);
  }
  for (const [index, url] of (input.orderedFrameUrls ?? []).entries()) {
    params.set(`stepImage${index}`, url);
  }
  return `/animate/instant?${params.toString()}`;
}

export function resolvePrimaryResultUrl(document: {
  backgroundUrl: string;
  instructionVariants?: Array<{ id: string; resultUrl?: string; approvalStatus?: string }>;
}): string {
  const approved = activeApprovedVariant(document as import("@/types/homecheff-visual-editor").EditorCanvasDocument);
  return approved?.resultUrl ?? document.backgroundUrl;
}
