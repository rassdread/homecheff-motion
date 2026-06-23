/**
 * Sprint K1.10 — admin audit card for Vision Target Picker V2.
 */

import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { VisionTargetNodeV2, VisionTargetPickerAuditCard } from "@/types/vision-target-picker";
import { resolveVisionTargetHighlightGeometry } from "@/lib/vision-target-highlight";

export function buildVisionTargetPickerAuditCard(input: {
  document: EditorCanvasDocument;
  node: VisionTargetNodeV2 | null;
  datasource: string;
}): VisionTargetPickerAuditCard {
  const geometry = input.node
    ? resolveVisionTargetHighlightGeometry(input.document, input.node)
    : null;

  return {
    source: input.datasource,
    polygon: Boolean(geometry?.polygon?.length),
    mask: Boolean(geometry?.maskUrl),
    quad: Boolean(geometry?.quad),
    targetLabel: input.node?.label ?? "—",
    confidenceTier: input.node?.confidenceTier ?? "review_recommended",
    brandingEligible: input.node?.brandingEligible ?? false,
    motionEligible: input.node?.motionEligible ?? false,
  };
}
