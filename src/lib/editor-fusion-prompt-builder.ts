import {
  buildCategoryNegativePrompt,
  buildCategoryOutputPromptLines,
} from "@/lib/editor-fusion-archetypes";
import { activePreservationRules } from "@/lib/editor-fusion-plan";
import { buildReferenceMetadataPromptLines } from "@/lib/editor-reference-metadata-prompt";
import { buildFusionIntelligencePrompt } from "@/lib/editor-fusion-render-payload";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type { EditorFusionPlan } from "@/types/editor-instruction-studio";

const PRESERVATION_STRENGTH_PHRASE: Record<EditorFusionPlan["preservation"]["strength"], string> = {
  low: "Apply preservation loosely — allow moderate change outside the listed rules.",
  medium: "Apply preservation moderately — keep listed elements mostly consistent.",
  high: "Apply preservation strongly — listed elements must remain clearly recognizable.",
  strict:
    "Apply preservation strictly — listed elements must not change unless explicitly overridden in fusion operations.",
};

export function buildEditorFusionPrompt(input: {
  plan: EditorFusionPlan;
  brandIdentity?: string;
  preserveStyle?: number;
  preserveBrand?: number;
  referenceAssignments?: EditorReferenceAssignment[];
  fusionRenderPayload?: FusionRenderPayload;
}): string {
  if (input.fusionRenderPayload) {
    const intelligencePrompt = buildFusionIntelligencePrompt(input.fusionRenderPayload);
    const metadataLines = buildReferenceMetadataPromptLines(input.referenceAssignments ?? []);
    if (metadataLines.length === 0) {
      return intelligencePrompt;
    }
    return `${intelligencePrompt}\n\nREFERENCE METADATA\n${metadataLines.join("\n")}`;
  }

  const { plan } = input;
  const preserveStyle = input.preserveStyle ?? 80;
  const preserveBrand = input.preserveBrand ?? 85;
  const preserveRules = activePreservationRules(plan);
  const enabledTraits = plan.inheritedTraits.filter((t) => t.enabled);

  const lines = [
    "IMAGE FUSION",
    "This is AI-directed fusion — not Photoshop compositing.",
    "Analyze references, follow the fusion plan, and generate one cohesive variant.",
    "",
    "FUSION INTENT",
    plan.intent,
    `Category: ${plan.category}`,
    `Fusion strength: ${plan.fusionStrength}%`,
    "",
    "BASE IMAGE",
    plan.baseImageUrl,
    "",
    "WHAT MAY CHANGE",
  ];

  if (plan.items.length === 0 && enabledTraits.length === 0) {
    lines.push("- Apply fusion intent using reference images and user instructions.");
  }

  const sorted = [...plan.items].sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    const ref = plan.references.find((r) => r.id === item.sourceReferenceId);
    const refLabel = ref?.name ?? "Reference";
    lines.push(
      `- ${item.targetRole}: ${item.instruction ?? `Use ${item.sourceObjectLabel} from ${refLabel}`}`
    );
  }

  for (const trait of enabledTraits) {
    lines.push(`- Inherit ${trait.label}${trait.group ? ` (${trait.group})` : ""} from references.`);
  }

  if (plan.styleRules.length > 0) {
    lines.push("", "STYLE RULES", ...plan.styleRules.map((r) => `- ${r}`));
  }

  lines.push("", "WHAT MUST STAY", PRESERVATION_STRENGTH_PHRASE[plan.preservation.strength]);
  if (preserveRules.length === 0) {
    lines.push("- No explicit preservation rules — prioritize fusion intent.");
  } else {
    for (const rule of preserveRules) {
      lines.push(`- Preserve ${rule.replace(/_/g, " ")}.`);
    }
  }

  if (preserveBrand >= 75 && input.brandIdentity?.trim()) {
    lines.push(`- Preserve brand identity (${input.brandIdentity.trim()}).`);
  }

  if (plan.brandRules.length > 0) {
    lines.push("", "BRAND RULES", ...plan.brandRules.map((r) => `- ${r}`));
  }

  if (preserveStyle >= 75) {
    lines.push("- Keep overall illustration style consistent with the base image.");
  }

  lines.push(
    "",
    "IDENTITY CONSISTENCY",
    "- Do not mutate unrelated areas.",
    "- Blend lighting, perspective, and scale naturally.",
    "- Enforce fusion strength: higher values allow more change from references."
  );

  if (plan.simulationDisclaimer) {
    lines.push("", "SIMULATION NOTICE", plan.simulationDisclaimer);
  }

  if (plan.userInstructions.trim()) {
    lines.push("", "USER INSTRUCTIONS", plan.userInstructions.trim());
  }

  const categoryOutputLines = buildCategoryOutputPromptLines(plan.intent, plan.generationSettings);
  if (categoryOutputLines.length > 0) {
    lines.push("", "CATEGORY OUTPUT SETTINGS", ...categoryOutputLines);
  }

  const negativePrompt = buildCategoryNegativePrompt(plan.intent, plan.generationSettings);
  if (negativePrompt.trim()) {
    lines.push("", "NEGATIVE PROMPT", negativePrompt.trim());
  }

  const metadataLines = buildReferenceMetadataPromptLines(input.referenceAssignments ?? []);
  if (metadataLines.length > 0) {
    lines.push("", "REFERENCE METADATA", ...metadataLines);
  }

  return lines.join("\n");
}
