/**
 * S2B.2 — Delta-first clothing transformation prompt policy.
 * Reuses Fusion intelligence text when present; adds canonical protection semantics.
 */

import type { ImageTransformationIntent, TransformationPlan } from "@/types/studio-image-transformation";

function protectionLines(intent: ImageTransformationIntent): string[] {
  const lines = ["PRESERVE:"];
  for (const rule of intent.protectedTargets) {
    if (rule.level === "MUST_PRESERVE" || rule.level === "SHOULD_PRESERVE") {
      lines.push(`- Keep ${rule.property} (${rule.level.replace(/_/g, " ").toLowerCase()}).`);
    }
    if (rule.level === "MUST_NOT_IMPORT_FROM_REFERENCE") {
      lines.push(`- Do not import ${rule.property} from the clothing reference.`);
    }
  }
  if (lines.length === 1) {
    lines.push(
      "- Keep the base person's identity, facial features, hair, age appearance, skin tone, body proportions, pose, camera framing and background as unchanged as possible."
    );
  }
  return lines;
}

function transferLines(intent: ImageTransformationIntent): string[] {
  const clothingRule = intent.negativeTransferRules.find((r) => r.referenceRole === "CLOTHING_REFERENCE");
  const transfer = clothingRule?.transfer.length
    ? clothingRule.transfer.join(", ")
    : intent.changeTargets.join(", ") || "clothing";
  const doNot = clothingRule?.doNotTransfer ?? [
    "face",
    "body",
    "pose",
    "background",
    "identity",
  ];
  return [
    "TRANSFER:",
    `- Use only the clothing design, material, color and garment details (${transfer}) from the clothing reference.`,
    "DO NOT IMPORT:",
    `- Do not copy the reference person's ${doNot.join(", ")}.`,
    "MASK:",
    "- Only the designated clothing region may be changed.",
  ];
}

export function buildClothingTransformationPrompt(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  fusionIntelligencePrompt?: string | null;
}): string {
  const changeTarget =
    input.intent.changeTargets.length > 0
      ? input.intent.changeTargets.join(", ")
      : "clothing";

  const deltaBlock = [
    "EDIT GOAL:",
    `Replace only the base person's ${changeTarget} with the clothing shown in the clothing reference image.`,
    "",
    ...protectionLines(input.intent),
    "",
    ...transferLines(input.intent),
    "",
    "Do not re-describe or regenerate the person from scratch.",
  ];

  const fusion = input.fusionIntelligencePrompt?.trim();
  if (fusion) {
    return `${deltaBlock.join("\n")}\n\nFUSION CONTEXT\n${fusion}`;
  }
  return deltaBlock.join("\n");
}

export function clothingPromptContainsNegativeTransferGuard(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    lower.includes("do not copy the reference") ||
    lower.includes("do not import") ||
    lower.includes("must_not_import")
  );
}

export function clothingPromptPreservesIdentity(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return lower.includes("preserve") && (lower.includes("identity") || lower.includes("face"));
}
