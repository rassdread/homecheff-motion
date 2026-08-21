/**
 * S2B.4 — Product/logo delta prompt policy (protection + negative transfer).
 */

import type { ImageTransformationIntent, TransformationPlan } from "@/types/studio-image-transformation";

export function buildProductLogoTransformationPrompt(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  fusionIntelligencePrompt?: string | null;
}): string {
  const isLogo = input.intent.operation === "LOGO_PRESERVE";
  const productRule = input.intent.negativeTransferRules.find((r) => r.referenceRole === "PRODUCT_REFERENCE");
  const logoRule = input.intent.negativeTransferRules.find((r) => r.referenceRole === "LOGO_REFERENCE");

  const lines = [
    "EDIT GOAL:",
    isLogo
      ? "Preserve the exact logo artwork on the base image. Prefer deterministic pixel placement over redrawing typography."
      : "Preserve exact product geometry/packaging on the base image. Prefer deterministic composite/inject over generative redraw when exactness is required.",
    "",
    "BASE:",
    "- The first image is the visual baseline (product scene or person/scene containing the brand asset).",
    "",
    "PRESERVE:",
  ];

  for (const rule of input.intent.protectedTargets) {
    if (rule.level === "MUST_PRESERVE" || rule.level === "SHOULD_PRESERVE") {
      lines.push(`- Keep ${rule.property} (${rule.level.replace(/_/g, " ").toLowerCase()}).`);
    }
  }
  if (!input.intent.protectedTargets.some((p) => p.property.includes("logo"))) {
    lines.push("- Keep logo artwork (must preserve) when a logo reference is supplied.");
  }
  if (!input.intent.protectedTargets.some((p) => p.property.includes("product"))) {
    lines.push("- Keep product geometry (must preserve) when a product reference requires exactness.");
  }

  lines.push("", "TRANSFER:");
  if (isLogo) {
    lines.push("- Transfer only exact logo artwork / placement from the logo reference.");
    lines.push("DO NOT IMPORT:");
    lines.push(
      `- Do not copy ${(logoRule?.doNotTransfer ?? ["background", "layout", "unrelated branding"]).join(", ")}.`
    );
  } else {
    lines.push("- Transfer only product packaging/geometry from the product reference.");
    lines.push("DO NOT IMPORT:");
    lines.push(
      `- Do not copy ${(productRule?.doNotTransfer ?? ["hands", "table", "background", "photographer"]).join(", ")}.`
    );
  }

  lines.push(
    "",
    `Route: ${input.plan.actualRoute ?? input.plan.requestedRoute}.`,
    "Do not treat generative redraw as equivalent to exact logo/product preservation."
  );

  const fusion = input.fusionIntelligencePrompt?.trim();
  if (fusion) {
    return `${lines.join("\n")}\n\nFUSION CONTEXT\n${fusion}`;
  }
  return lines.join("\n");
}

export function productLogoPromptRequiresPixelExact(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return lower.includes("exact") && (lower.includes("logo") || lower.includes("product"));
}

export function productLogoPromptBlocksGenerativeRedrawEquivalence(prompt: string): boolean {
  return prompt.toLowerCase().includes("do not treat generative redraw as equivalent");
}
