/**
 * Fusion render payload — structured input for image generation.
 */

import {
  buildFusionBlueprint,
  formatFusionBlueprintTraitLines,
} from "@/lib/editor-fusion-blueprint";
import { resolveCompositionBaseImageUrl } from "@/lib/editor-composition-plan";
import type {
  FusionBlueprint,
  FusionRenderPayload,
  ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent, EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function buildFusionRenderPayload(input: {
  document: EditorCanvasDocument;
  plan: EditorFusionPlan;
  profiles: ReferenceAnalysisProfile[];
  blueprint?: FusionBlueprint;
}): FusionRenderPayload {
  const blueprint =
    input.blueprint ??
    buildFusionBlueprint({
      intent: input.plan.intent,
      plan: input.plan,
      profiles: input.profiles,
    });

  const base = resolveCompositionBaseImageUrl(input.document);
  const logoAssets: FusionRenderPayload["logoAssets"] = [];
  const references: FusionRenderPayload["references"] = [];

  for (const ref of input.plan.references) {
    const profile = input.profiles.find((p) => p.imageUrl === ref.url || p.referenceId === ref.id);
    const entry = {
      referenceId: ref.id,
      role: profile?.role,
      url: ref.url,
      name: ref.name,
      isLogo: ref.type === "logo",
    };
    if (ref.type === "logo") {
      logoAssets.push(entry);
    } else {
      references.push(entry);
    }
  }

  for (const profile of input.profiles) {
    if (!references.some((r) => r.referenceId === profile.referenceId)) {
      references.push({
        referenceId: profile.referenceId,
        role: profile.role,
        url: profile.imageUrl,
        name: profile.name,
      });
    }
  }

  const styleDNA = input.profiles
    .filter((p) => p.styleDNA)
    .map((p) => ({ referenceId: p.referenceId, styleDNA: p.styleDNA! }));

  return {
    blueprint,
    styleDNA,
    referenceAnalysis: input.profiles,
    renderInstructions: blueprint.renderInstructions,
    references,
    logoAssets,
    primaryImageUrl: input.plan.baseImageUrl || base.url,
  };
}

export function buildFusionIntelligencePrompt(payload: FusionRenderPayload): string {
  const lines = [
    "HOMECHEFF FUSION BLUEPRINT",
    "This is not a generic image combine. Follow the analyzed blueprint exactly.",
    "",
    "WORKFLOW",
    payload.blueprint.workflowType,
    "",
    "TRAIT ASSIGNMENTS",
    ...formatFusionBlueprintTraitLines(payload.blueprint),
    "",
    "REFERENCE ANALYSIS",
  ];

  for (const profile of payload.referenceAnalysis) {
    const label = profile.name ?? profile.role ?? profile.referenceId;
    lines.push(`--- ${label} ---`);
    if (profile.styleDNA?.visualStyle) {
      lines.push(`Visual style: ${profile.styleDNA.visualStyle}`);
    }
    if (profile.styleDNA?.colorTheme) {
      lines.push(`Color theme: ${profile.styleDNA.colorTheme}`);
    }
    if (profile.identityTraits.length) {
      lines.push(`Identity: ${profile.identityTraits.slice(0, 6).join("; ")}`);
    }
    if (profile.clothing.length) {
      lines.push(`Clothing: ${profile.clothing.join(", ")}`);
    }
    if (profile.accessories.length) {
      lines.push(`Accessories: ${profile.accessories.join(", ")}`);
    }
    if (profile.pose) {
      lines.push(`Pose: ${profile.pose}`);
    }
    if (profile.background) {
      lines.push(`Background cues: ${profile.background}`);
    }
    const detailParts = profile.parts
      .filter((p) => ["eyes", "mouth", "hair", "face"].includes(p.category))
      .map((p) => `${p.category}: ${p.label}`);
    if (detailParts.length) {
      lines.push(`Features: ${detailParts.join("; ")}`);
    }
    lines.push("");
  }

  if (payload.blueprint.preservationRules.length) {
    lines.push("PRESERVATION", ...payload.blueprint.preservationRules.map((r) => `- ${r}`), "");
  }

  if (payload.blueprint.styleNotes.length) {
    lines.push("STYLE NOTES", ...payload.blueprint.styleNotes.map((n) => `- ${n}`), "");
  }

  lines.push("RENDER INSTRUCTIONS", ...payload.renderInstructions.map((r) => `- ${r}`));

  if (payload.logoAssets.length) {
    lines.push(
      "",
      "LOGO RULES",
      "- Logo assets must remain pixel-faithful — do not redraw or reinterpret.",
      ...payload.logoAssets.map((l) => `- Logo: ${l.name ?? l.referenceId} (${l.url})`)
    );
  }

  if (payload.references.length > 1) {
    lines.push(
      "",
      "REFERENCE IMAGES",
      ...payload.references.map((r) => `- ${r.name ?? r.role ?? r.referenceId}: ${r.url}`)
    );
  }

  lines.push(
    "",
    "PRIMARY BASE IMAGE",
    payload.primaryImageUrl,
    "",
    "OUTPUT",
    "Generate one cohesive new image from this HomeCheff Fusion Blueprint and analyzed references."
  );

  if (payload.blueprint.simulationDisclaimer) {
    lines.push("", "SIMULATION NOTICE", payload.blueprint.simulationDisclaimer);
  }

  return lines.join("\n").slice(0, 3900);
}

export function fusionIntelligencePromptForDocument(input: {
  document: EditorCanvasDocument;
  plan: EditorFusionPlan;
  profiles: ReferenceAnalysisProfile[];
  intent?: EditorFusionIntent;
}): { prompt: string; payload: FusionRenderPayload } {
  const payload = buildFusionRenderPayload({
    document: input.document,
    plan: input.plan,
    profiles: input.profiles,
  });
  return {
    prompt: buildFusionIntelligencePrompt(payload),
    payload,
  };
}
