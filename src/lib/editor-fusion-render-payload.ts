/**
 * Fusion render payload — structured input for image generation.
 */

import {
  buildBrandAssetProtectionLayer,
  buildBrandProtectionPromptBlock,
} from "@/lib/brand-asset-protection-layer";
import {
  buildFusionBlueprint,
  formatEnrichedFusionBlueprintTraitLines,
} from "@/lib/editor-fusion-blueprint";
import {
  applyConsistencyRulesToBlueprintPreservation,
  buildCharacterConsistencyRenderInstructions,
} from "@/lib/character-consistency-rule-engine";
import { formatCharacterConsistencyPromptBlocks } from "@/lib/character-consistency-profile";
import { enrichReferenceAnalysisProfile, resolveVisionTargetLabelFromBlueprint } from "@/lib/fusion-profile-enrichment";
import { resolveCompositionBaseImageUrl } from "@/lib/editor-composition-plan";
import type {
  FusionBlueprint,
  FusionRenderPayload,
  ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent, EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { LogoPlacementBlueprint, ProductBrandingLogoGeometry } from "@/types/brand-asset-protection";
import { resolveProductBrandingLogoGeometry } from "@/lib/logo-placement-blueprint";

export function buildFusionRenderPayload(input: {
  document: EditorCanvasDocument;
  plan: EditorFusionPlan;
  profiles: ReferenceAnalysisProfile[];
  blueprint?: FusionBlueprint;
  logoPlacement?: LogoPlacementBlueprint | null;
}): FusionRenderPayload {
  const enrichedProfiles = input.profiles.map((profile) =>
    enrichReferenceAnalysisProfile(profile, input.document)
  );

  const blueprintBase =
    input.blueprint ??
    buildFusionBlueprint({
      intent: input.plan.intent,
      plan: input.plan,
      profiles: enrichedProfiles,
    });

  const blueprint = applyConsistencyRulesToBlueprintPreservation(blueprintBase, input.plan.intent);

  const base = resolveCompositionBaseImageUrl(input.document);
  const logoAssets: FusionRenderPayload["logoAssets"] = [];
  const references: FusionRenderPayload["references"] = [];

  for (const ref of input.plan.references) {
    const profile = enrichedProfiles.find((p) => p.imageUrl === ref.url || p.referenceId === ref.id);
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

  for (const profile of enrichedProfiles) {
    if (!references.some((r) => r.referenceId === profile.referenceId)) {
      references.push({
        referenceId: profile.referenceId,
        role: profile.role,
        url: profile.imageUrl,
        name: profile.name,
      });
    }
  }

  const styleDNA = enrichedProfiles
    .filter((p) => p.styleDNA)
    .map((p) => ({ referenceId: p.referenceId, styleDNA: p.styleDNA! }));

  const explicitLogoPlacement =
    input.logoPlacement ?? input.document.instructionStudioState?.logoPlacementBlueprint ?? null;

  const productBrandingLogoGeometry =
    input.plan.intent === "product_branding" && !explicitLogoPlacement
      ? resolveProductBrandingLogoGeometry(input.document, input.plan.generationSettings)
      : null;

  const brandProtection = buildBrandAssetProtectionLayer({
    workflowType: input.logoPlacement ? "logo_placement" : input.plan.intent,
    logoAssets,
    profiles: enrichedProfiles,
    generationSettings: input.plan.generationSettings,
    logoPlacement: explicitLogoPlacement,
    productBrandingLogoGeometry,
    userPreserveLogoExact: input.plan.generationSettings.preserveLogoExact !== false,
    mascotPreserveLogo: input.plan.generationSettings.preserveLogo === true,
  });

  const consistencyInstructions = buildCharacterConsistencyRenderInstructions({
    workflow: input.plan.intent,
    profiles: enrichedProfiles,
    blueprint,
  });

  const renderInstructions = [
    ...blueprint.renderInstructions,
    ...consistencyInstructions,
    ...brandProtection.renderInstructions,
  ];

  if (explicitLogoPlacement?.targetLabel) {
    const targetKey = explicitLogoPlacement.normalizedTargetKey;
    const resolved =
      resolveVisionTargetLabelFromBlueprint(input.document, targetKey) ??
      explicitLogoPlacement.targetLabel;
    renderInstructions.push(
      `Vision placement target: ${resolved} — use exact target bounds from analysis, not generic zones.`
    );
    for (const extra of explicitLogoPlacement.additionalPlacementTargets ?? []) {
      renderInstructions.push(`Additional placement target: ${extra.targetLabel}`);
    }
  }

  return {
    blueprint,
    styleDNA,
    referenceAnalysis: enrichedProfiles,
    renderInstructions,
    references,
    logoAssets,
    primaryImageUrl: input.plan.baseImageUrl || base.url,
    brandProtection,
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
    ...formatEnrichedFusionBlueprintTraitLines(payload.blueprint, payload.referenceAnalysis),
    "",
    ...formatCharacterConsistencyPromptBlocks(payload.referenceAnalysis),
    "REFERENCE ANALYSIS",
  ];

  for (const profile of payload.referenceAnalysis) {
    const label = profile.name ?? profile.role ?? profile.referenceId;
    lines.push(`--- ${label} ---`);
    if (profile.personConsistency) {
      const p = profile.personConsistency;
      if (p.eyeColor || p.eyes) lines.push(`Eyes: ${p.eyeColor ?? p.eyes}`);
      if (p.hairColor) lines.push(`Hair color: ${p.hairColor}`);
      else if (p.hairStyle) lines.push(`Hair: ${p.hairStyle}`);
      if (p.glasses) lines.push("Glasses: yes");
      if (p.beard) lines.push("Beard: yes");
      if (p.mustache) lines.push("Mustache: yes");
      if (p.faceShape) lines.push(`Face shape: ${p.faceShape}`);
      const clothing = Object.values(p.clothing).filter(Boolean);
      if (clothing.length) lines.push(`Clothing: ${clothing.join(", ")}`);
      const accessories = Object.values(p.accessories).filter(Boolean);
      if (accessories.length) lines.push(`Accessories: ${accessories.join(", ")}`);
    }
    if (profile.mascotConsistency && (profile.mascotConsistency.emblems.length || profile.objectType === "mascot")) {
      const m = profile.mascotConsistency;
      if (m.emblems.length) lines.push(`Mascot emblems: ${m.emblems.join(", ")}`);
      if (m.colorPalette.length) lines.push(`Mascot palette: ${m.colorPalette.join(", ")}`);
      if (m.visualStyle) lines.push(`Mascot style: ${m.visualStyle}`);
    }
    if (profile.enrichment) {
      const e = profile.enrichment;
      if (e.eyes) lines.push(`Eyes: ${e.eyes}`);
      if (e.hair) lines.push(`Hair: ${e.hair}`);
      if (e.beard) lines.push("Beard: yes");
      if (e.glasses) lines.push("Glasses: yes");
      if (e.faceShape) lines.push(`Face shape: ${e.faceShape}`);
      if (e.clothingItems.length) lines.push(`Clothing: ${e.clothingItems.join(", ")}`);
      if (e.accessoryItems.length) lines.push(`Accessories: ${e.accessoryItems.join(", ")}`);
      if (e.styleDnaSummary) lines.push(`Style DNA: ${e.styleDnaSummary}`);
      if (e.dominantColors.length) lines.push(`Dominant colors: ${e.dominantColors.join(", ")}`);
      if (e.visionTargets.length) {
        lines.push(`Placement targets: ${e.visionTargets.map((t) => t.label).join(", ")}`);
      }
    }
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

  if (payload.brandProtection?.active) {
    lines.push("", ...buildBrandProtectionPromptBlock(payload.brandProtection));
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
