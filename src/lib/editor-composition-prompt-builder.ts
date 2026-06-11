import type { EditorCompositionPlan } from "@/types/editor-instruction-studio";

export function buildEditorCompositionPrompt(input: {
  plan: EditorCompositionPlan;
  brandIdentity?: string;
  preserveStyle?: number;
  preserveBrand?: number;
  userNotes?: string;
}): string {
  const { plan } = input;
  const preserveStyle = input.preserveStyle ?? 80;
  const preserveBrand = input.preserveBrand ?? 85;
  const lines = [
    "Using the base reference image, create one combined variant by reusing elements from the reference images below.",
    `Base image: ${plan.baseImageUrl}`,
  ];

  const sorted = [...plan.items].sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    const ref = plan.references.find((r) => r.id === item.sourceReferenceId);
    const refLabel = ref?.name ?? "Reference image";
    const instruction = item.instruction?.trim() || `Use ${item.sourceObjectLabel} from ${refLabel}`;
    lines.push(
      `- ${item.targetRole}: ${instruction} (from ${refLabel}, object: ${item.sourceObjectLabel}).`
    );
    if (item.preserveRules.length > 0) {
      lines.push(`  Preserve: ${item.preserveRules.join(", ")}.`);
    }
  }

  if (preserveStyle >= 75) {
    lines.push("Keep the overall illustration style highly consistent with the base image.");
  }
  if (preserveBrand >= 75) {
    const brand = input.brandIdentity?.trim() || "the brand";
    lines.push(`Preserve ${brand} brand colors and character identity.`);
    lines.push("Do not alter the character face unless explicitly requested.");
  }

  lines.push("Do not mutate unrelated areas. Blend lighting and perspective naturally.");
  if (input.userNotes?.trim()) {
    lines.push(`User notes: ${input.userNotes.trim()}`);
  }
  if (plan.userNotes?.trim()) {
    lines.push(`Composition notes: ${plan.userNotes.trim()}`);
  }

  return lines.join(" ");
}
