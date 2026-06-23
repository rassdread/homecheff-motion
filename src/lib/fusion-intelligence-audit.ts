/**
 * Sprint FQ0–FQ14 — Fusion Intelligence Audit (no new AI calls).
 */

import { formatEnrichedFusionBlueprintTraitLines } from "@/lib/editor-fusion-blueprint";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import {
  buildFusionIntelligencePrompt,
  buildFusionRenderPayload,
} from "@/lib/editor-fusion-render-payload";
import { fusionWorkflowUsesIntelligence } from "@/lib/editor-fusion-workflow-credits";
import { countFusionPayloadReferences } from "@/lib/editor-fusion-variant-render";
import { ensureFusionPlan, getFusionPlan } from "@/lib/editor-fusion-plan";
import { buildFusionDiagnosticExport, computeFusionQualityScore } from "@/lib/fusion-quality-score";
import type {
  FusionAuditWorkflow,
  FusionBlueprintAudit,
  FusionBrandingCoverageReport,
  FusionCharacterConsistencyReport,
  FusionDataTraceReport,
  FusionIntelligenceAuditReport,
  FusionIntelligenceDiagnosticExport,
  FusionPromptCoverageReport,
  FusionProviderPayloadCoverageReport,
  FusionSourceCoverageReport,
  FusionWorkflowCoverageMatrix,
} from "@/types/fusion-intelligence-audit";
import { FUSION_AUDIT_WORKFLOWS } from "@/types/fusion-intelligence-audit";
import type { FusionRenderPayload, ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const CHARACTER_WORKFLOWS = new Set<EditorFusionIntent>([
  "character_fusion",
  "future_child",
  "genetic_blend",
  "character_upgrade",
  "mascot_into_human",
  "human_into_mascot",
]);

const WORKFLOW_INTELLIGENCE_USAGE: Record<string, { analysis: boolean; blueprint: boolean; prompt: boolean; provider: boolean }> = {
  character_fusion: { analysis: true, blueprint: true, prompt: true, provider: true },
  future_child: { analysis: true, blueprint: true, prompt: true, provider: true },
  genetic_blend: { analysis: true, blueprint: true, prompt: true, provider: true },
  animal_human_fusion: { analysis: true, blueprint: true, prompt: true, provider: true },
  mascot_transform: { analysis: true, blueprint: true, prompt: true, provider: true },
  mascot_into_human: { analysis: true, blueprint: true, prompt: true, provider: true },
  mascot_to_human: { analysis: true, blueprint: true, prompt: true, provider: true },
  human_into_mascot: { analysis: true, blueprint: true, prompt: true, provider: true },
  outfit_from_reference: { analysis: true, blueprint: true, prompt: true, provider: true },
  product_branding: { analysis: true, blueprint: true, prompt: true, provider: true },
  product_packaging: { analysis: true, blueprint: true, prompt: true, provider: true },
  product_environment: { analysis: true, blueprint: false, prompt: true, provider: true },
  logo_placement: { analysis: true, blueprint: true, prompt: true, provider: true },
  campaign_variant: { analysis: true, blueprint: false, prompt: true, provider: true },
};

function hasPremiumAnalysis(document: EditorCanvasDocument): boolean {
  return Boolean(
    document.visionV6Meta?.openAiPartsUsed ||
      (document.visionV6Meta?.mergedAnalysisParts?.length ?? 0) > 0 ||
      document.visionAnalysis?.confidence
  );
}

function hasVisionHierarchy(document: EditorCanvasDocument): boolean {
  return (document.visionHierarchy?.length ?? 0) > 0;
}

function hasSelectionShape(document: EditorCanvasDocument): boolean {
  return document.objects.some((layer) => Boolean(layer.selectionShape));
}

export function buildFusionSourceCoverageReport(
  document: EditorCanvasDocument
): FusionSourceCoverageReport {
  const merged = document.visionV6Meta?.mergedAnalysisParts ?? [];
  const sources = [
    {
      source: "rtdetr",
      populated: (document.visionV6Meta?.rtdetrCount ?? 0) > 0,
      storedAt: ["detectedObjects", "visionV6Meta.rtdetrCount"],
      readAt: ["buildReferenceAnalysisProfile", "buildVisibleEditorPartsTree"],
      usedAt: ["ReferenceAnalysisProfile.parts"],
      lostAt: ["instructionObjectFeedCollapse"],
      count: document.visionV6Meta?.rtdetrCount,
    },
    {
      source: "mergedAnalysisParts",
      populated: merged.length > 0,
      storedAt: ["visionV6Meta.mergedAnalysisParts"],
      readAt: ["buildReferenceAnalysisProfile", "vision-target-picker-v2"],
      usedAt: ["ReferenceAnalysisProfile", "FusionBlueprint"],
      lostAt: merged.length > 0 && !hasPremiumAnalysis(document) ? ["premiumGate"] : [],
      count: merged.length,
    },
    {
      source: "visionHierarchy",
      populated: hasVisionHierarchy(document),
      storedAt: ["visionHierarchy"],
      readAt: ["vision-target-picker-v2"],
      usedAt: ["enrichment.visionTargets", "logoPlacementBlueprint"],
      lostAt: ["fusionBlueprintTraitCollapse"],
      count: document.visionHierarchy?.length,
    },
    {
      source: "styleDNA",
      populated: Boolean(document.visionAnalysis?.visualStyle),
      storedAt: ["visionAnalysis"],
      readAt: ["mapVisionAnalysisToStyleDna"],
      usedAt: ["ReferenceAnalysisProfile.styleDNA", "FusionRenderPayload.styleDNA"],
      lostAt: [],
    },
    {
      source: "selectionShape",
      populated: hasSelectionShape(document),
      storedAt: ["objects[].selectionShape"],
      readAt: ["resolveEditorSelectionGeometry"],
      usedAt: ["logoPlacementBlueprint", "brandProtection"],
      lostAt: ["nonBrandingWorkflows"],
      count: document.objects.filter((l) => l.selectionShape).length,
    },
    {
      source: "VisionTargetNodeV2",
      populated: merged.length > 0 || hasVisionHierarchy(document),
      storedAt: ["visionHierarchy", "mergedAnalysisParts"],
      readAt: ["buildVisionTargetTreeFromDocument"],
      usedAt: ["enrichment.visionTargets", "renderInstructions"],
      lostAt: [],
    },
    {
      source: "LogoPlacementBlueprint",
      populated: Boolean(document.instructionStudioState?.logoPlacementBlueprint),
      storedAt: ["instructionStudioState.logoPlacementBlueprint"],
      readAt: ["buildFusionRenderPayload"],
      usedAt: ["brandProtection", "renderInstructions"],
      lostAt: [],
    },
    {
      source: "BrandLockedAsset",
      populated: Boolean(document.instructionStudioState?.fusionIntelligence?.renderPayload?.brandProtection),
      storedAt: ["fusionIntelligence.renderPayload"],
      readAt: ["brand-asset-motion-lock"],
      usedAt: ["motion handoff"],
      lostAt: ["staticImageOnlyWorkflows"],
    },
  ];

  return { sources, generatedAt: new Date().toISOString() };
}

export function buildFusionDataTraceReport(input: {
  document: EditorCanvasDocument;
  workflow: EditorFusionIntent;
  payload?: FusionRenderPayload | null;
  prompt?: string;
}): FusionDataTraceReport {
  const hasAnalysis = hasPremiumAnalysis(input.document);
  const storedIntelligence = input.document.instructionStudioState?.fusionIntelligence;
  const hasProfile = (storedIntelligence?.referenceProfiles.length ?? 0) > 0 || hasAnalysis;
  const hasBlueprint = Boolean(input.payload?.blueprint ?? storedIntelligence?.blueprint);
  const hasPayload = Boolean(input.payload ?? storedIntelligence?.renderPayload);
  const hasPrompt = Boolean(input.prompt && input.prompt.length > 50);
  const hasProvider = hasPayload && (input.payload?.references.length ?? 0) > 0;
  const hasOutput = Boolean(storedIntelligence?.lastRun?.status === "completed");

  const steps = [
    { stage: "upload" as const, exists: true, stored: true, used: true, lost: false, ignored: false },
    {
      stage: "analysis" as const,
      exists: hasAnalysis,
      stored: hasAnalysis,
      used: hasProfile,
      lost: hasAnalysis && !hasProfile,
      ignored: !hasAnalysis,
    },
    {
      stage: "reference_profile" as const,
      exists: hasProfile,
      stored: hasProfile,
      used: hasBlueprint,
      lost: hasProfile && !hasBlueprint,
      ignored: false,
    },
    {
      stage: "fusion_blueprint" as const,
      exists: hasBlueprint,
      stored: hasBlueprint,
      used: hasPayload,
      lost: false,
      ignored: !fusionWorkflowUsesIntelligence(input.workflow),
    },
    {
      stage: "render_payload" as const,
      exists: hasPayload,
      stored: hasPayload,
      used: hasPrompt,
      lost: false,
      ignored: false,
    },
    {
      stage: "prompt" as const,
      exists: hasPrompt,
      stored: hasPrompt,
      used: hasProvider,
      lost: hasPayload && !hasPrompt,
      ignored: false,
      notes: hasPrompt ? undefined : "prompt_not_built_or_truncated",
    },
    {
      stage: "provider_request" as const,
      exists: hasProvider,
      stored: hasProvider,
      used: hasOutput,
      lost: hasPrompt && !hasProvider,
      ignored: false,
    },
    {
      stage: "output" as const,
      exists: hasOutput,
      stored: hasOutput,
      used: hasOutput,
      lost: hasProvider && !hasOutput,
      ignored: !hasOutput,
    },
  ];

  return {
    workflow: input.workflow,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionWorkflowCoverageMatrix(
  document?: EditorCanvasDocument
): FusionWorkflowCoverageMatrix {
  const analysisPresent = document ? hasPremiumAnalysis(document) : false;

  const workflows = FUSION_AUDIT_WORKFLOWS.map((workflow) => {
    const usage = WORKFLOW_INTELLIGENCE_USAGE[workflow] ?? {
      analysis: false,
      blueprint: false,
      prompt: true,
      provider: true,
    };
    const intelligence = fusionWorkflowUsesIntelligence(workflow as EditorFusionIntent);
    return {
      workflow,
      analysisPresent,
      analysisUsed: analysisPresent && usage.analysis && intelligence,
      blueprintUsed: usage.blueprint && intelligence,
      promptUsed: usage.prompt,
      providerUsed: usage.provider,
      outputUsed: Boolean(document?.instructionStudioState?.fusionIntelligence?.lastRun),
      notes: intelligence ? "fusion_intelligence_enabled" : "legacy_plan_prompt_only",
    };
  });

  return { workflows, generatedAt: new Date().toISOString() };
}

function promptMentions(prompt: string, token: string): boolean {
  return prompt.toLowerCase().includes(token.toLowerCase());
}

export function buildFusionPromptCoverageReport(input: {
  document: EditorCanvasDocument;
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  prompt: string;
}): FusionPromptCoverageReport {
  const items: FusionPromptCoverageReport["availableItems"] = [];

  for (const profile of input.profiles) {
    const e = profile.enrichment;
    if (e?.eyes) {
      items.push({ label: `Eyes: ${e.eyes}`, available: true, usedInPrompt: promptMentions(input.prompt, e.eyes) });
    }
    if (e?.hair) {
      items.push({ label: `Hair: ${e.hair}`, available: true, usedInPrompt: promptMentions(input.prompt, e.hair) });
    }
    if (e?.glasses !== undefined) {
      items.push({
        label: `Glasses: ${e.glasses ? "yes" : "no"}`,
        available: true,
        usedInPrompt: promptMentions(input.prompt, "glasses"),
      });
    }
    if (e?.styleDnaSummary) {
      items.push({
        label: `Style DNA: ${e.styleDnaSummary}`,
        available: true,
        usedInPrompt: promptMentions(input.prompt, e.styleDnaSummary.slice(0, 24)),
      });
    }
    if (profile.clothing.length) {
      for (const item of profile.clothing) {
        items.push({ label: `Clothing: ${item}`, available: true, usedInPrompt: promptMentions(input.prompt, item) });
      }
    }
  }

  const availableCount = items.filter((i) => i.available).length;
  const usedCount = items.filter((i) => i.usedInPrompt).length;
  const promptCoveragePercent =
    availableCount > 0 ? Math.round((usedCount / availableCount) * 100) : items.length === 0 ? 100 : 0;

  return {
    workflow: input.workflow,
    availableItems: items,
    promptCoveragePercent,
    samplePromptExcerpt: input.prompt.slice(0, 400),
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionBlueprintAudit(input: {
  workflow: EditorFusionIntent;
  blueprint: import("@/types/editor-fusion-intelligence").FusionBlueprint;
  profiles: ReferenceAnalysisProfile[];
}): FusionBlueprintAudit {
  const filledFields = [
    input.blueprint.references.length > 0 ? "references" : "",
    Object.keys(input.blueprint.traitAssignments).length > 0 ? "traitAssignments" : "",
    input.blueprint.renderInstructions.length > 0 ? "renderInstructions" : "",
    input.blueprint.preservationRules.length > 0 ? "preservationRules" : "",
    input.blueprint.styleNotes.length > 0 ? "styleNotes" : "",
  ].filter(Boolean);

  const neverPopulated = ["simulationDisclaimer", "styleNotes"].filter((field) => {
    if (field === "styleNotes") return input.blueprint.styleNotes.length === 0;
    return !input.blueprint.simulationDisclaimer;
  });

  const enrichedLines = formatEnrichedFusionBlueprintTraitLines(input.blueprint, input.profiles);
  const enrichedTraitCount = enrichedLines.filter((line) => line.includes("—")).length;

  const availableTraits = new Set<string>();
  for (const profile of input.profiles) {
    for (const part of profile.parts) {
      availableTraits.add(part.category);
    }
    if (profile.enrichment?.eyes) availableTraits.add("eyes");
    if (profile.enrichment?.hair) availableTraits.add("hair");
  }

  const assignedTraits = Object.keys(input.blueprint.traitAssignments);
  const ignoredAnalysisTraits = [...availableTraits].filter(
    (trait) => !assignedTraits.some((assigned) => assigned.toLowerCase().includes(trait))
  );

  return {
    workflow: input.workflow,
    filledFields,
    unusedFilledFields: input.blueprint.styleNotes.length > 0 && !input.profiles.some((p) => p.styleDNA) ? ["styleNotes"] : [],
    neverPopulatedFields: neverPopulated,
    ignoredAnalysisTraits,
    traitAssignmentCount: assignedTraits.length,
    enrichedTraitCount,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionProviderPayloadCoverageReport(input: {
  workflow: EditorFusionIntent;
  payload: FusionRenderPayload;
  prompt: string;
}): FusionProviderPayloadCoverageReport {
  const targetFields: string[] = [];
  if (input.payload.brandProtection?.active) {
    targetFields.push("brandProtection");
  }
  const logoPlacement = input.payload.brandProtection?.assets.length
    ? "protectedAssets"
    : "";
  if (logoPlacement) targetFields.push(logoPlacement);

  for (const profile of input.payload.referenceAnalysis) {
    if (profile.enrichment?.visionTargets.length) {
      targetFields.push("visionTargets");
      break;
    }
  }

  const checks = [
    input.prompt.length > 0,
    input.payload.references.length > 0,
    input.payload.logoAssets.length > 0 || input.workflow !== "product_branding",
    targetFields.length > 0 || !input.payload.brandProtection?.active,
    Boolean(input.payload.primaryImageUrl),
  ];
  const coveragePercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    workflow: input.workflow,
    promptIncluded: input.prompt.length > 0,
    referenceCount: countFusionPayloadReferences(input.payload),
    logoAssetCount: input.payload.logoAssets.length,
    targetFieldsIncluded: targetFields,
    protectedAssetCount: input.payload.brandProtection?.assets.length ?? 0,
    placementDataIncluded: targetFields.includes("visionTargets") || Boolean(input.payload.brandProtection?.active),
    coveragePercent,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionBrandingCoverageReport(input: {
  workflow: EditorFusionIntent;
  document: EditorCanvasDocument;
  payload: FusionRenderPayload;
  prompt: string;
}): FusionBrandingCoverageReport {
  const logoBlueprint = input.document.instructionStudioState?.logoPlacementBlueprint;
  const checks = [
    Boolean(logoBlueprint),
    Boolean(input.payload.brandProtection?.active),
    input.prompt.toLowerCase().includes("logo") || input.prompt.toLowerCase().includes("brand"),
    Boolean(logoBlueprint?.hierarchyNodeId || logoBlueprint?.targetLabel),
    (input.payload.brandProtection?.assets.length ?? 0) > 0,
  ];
  const coveragePercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    workflow: input.workflow,
    logoPlacementInBlueprint: Boolean(logoBlueprint),
    protectedAssetsInPayload: Boolean(input.payload.brandProtection?.active),
    brandLockedInMotionHandoff: Boolean(input.document.studioMotionHandoff),
    targetsInPrompt:
      input.prompt.includes("Vision placement target") ||
      input.prompt.includes("Placement targets"),
    coveragePercent,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionCharacterConsistencyReport(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  payload: FusionRenderPayload;
  prompt: string;
}): FusionCharacterConsistencyReport {
  const dimensions: FusionCharacterConsistencyReport["rows"][number]["dimension"][] = [
    "face",
    "hair",
    "eyes",
    "accessories",
    "clothing",
    "style",
  ];

  const rows = dimensions.map((dimension) => {
    const available = input.profiles.some((profile) => {
      const e = profile.enrichment;
      if (dimension === "eyes") return Boolean(e?.eyes) || profile.parts.some((p) => p.category === "eyes");
      if (dimension === "hair") return Boolean(e?.hair) || profile.parts.some((p) => p.category === "hair");
      if (dimension === "face") return Boolean(e?.faceShape) || profile.parts.some((p) => p.category === "face");
      if (dimension === "accessories") return (e?.accessoryItems.length ?? 0) > 0 || profile.accessories.length > 0;
      if (dimension === "clothing") return (e?.clothingItems.length ?? 0) > 0 || profile.clothing.length > 0;
      if (dimension === "style") return Boolean(e?.styleDnaSummary || profile.styleDNA);
      return false;
    });

    const inProfile = available;
    const inBlueprint = Object.keys(input.payload.blueprint.traitAssignments).some((trait) =>
      trait.toLowerCase().includes(dimension === "style" ? "style" : dimension)
    );
    const inPrompt = input.prompt.toLowerCase().includes(dimension);
    const inProvider = inPrompt && input.payload.references.length > 0;

    return { dimension, available, inProfile, inBlueprint, inPrompt, inProvider };
  });

  const applicable = CHARACTER_WORKFLOWS.has(input.workflow) ? rows : rows.filter((r) => r.available);
  const scoreRows = applicable.length > 0 ? applicable : rows;
  const hits = scoreRows.filter((r) => r.available && r.inPrompt).length;
  const coveragePercent =
    scoreRows.filter((r) => r.available).length > 0
      ? Math.round((hits / scoreRows.filter((r) => r.available).length) * 100)
      : 100;

  return {
    workflow: input.workflow,
    rows,
    coveragePercent,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionIntelligenceAuditReport(input: {
  document: EditorCanvasDocument;
  profiles?: ReferenceAnalysisProfile[];
}): FusionIntelligenceAuditReport {
  const document = ensureFusionPlan(input.document);
  const plan = getFusionPlan(document);
  if (!plan) {
    throw new Error("Fusion plan required for intelligence audit");
  }
  const workflow = plan.intent;
  const profiles =
    input.profiles ??
    input.document.instructionStudioState?.fusionIntelligence?.referenceProfiles ??
    [buildReferenceAnalysisProfile({ document: input.document, referenceId: "primary", premiumCached: hasPremiumAnalysis(input.document) })];

  const payload = buildFusionRenderPayload({ document, plan, profiles });
  const prompt = buildFusionIntelligencePrompt(payload);

  const sourceCoverage = buildFusionSourceCoverageReport(document);
  const dataTrace = buildFusionDataTraceReport({ document, workflow, payload, prompt });
  const workflowMatrix = buildFusionWorkflowCoverageMatrix(document);
  const promptCoverage = buildFusionPromptCoverageReport({ document, workflow, profiles, prompt });
  const blueprintAudit = buildFusionBlueprintAudit({ workflow, blueprint: payload.blueprint, profiles });
  const providerPayload = buildFusionProviderPayloadCoverageReport({ workflow, payload, prompt });
  const brandingCoverage = buildFusionBrandingCoverageReport({ workflow, document, payload, prompt });
  const characterConsistency = buildFusionCharacterConsistencyReport({ workflow, profiles, payload, prompt });

  const qualityScore = computeFusionQualityScore({
    workflow,
    sourceCoverage,
    promptCoverage,
    blueprintAudit,
    providerPayload,
    brandingCoverage,
    characterConsistency,
  });

  return {
    workflow,
    dataTrace,
    sourceCoverage,
    workflowMatrix,
    promptCoverage,
    blueprintAudit,
    providerPayload,
    brandingCoverage,
    characterConsistency,
    qualityScore,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionIntelligenceDiagnosticExport(
  report: FusionIntelligenceAuditReport
): FusionIntelligenceDiagnosticExport {
  return buildFusionDiagnosticExport(report.qualityScore);
}

export function logFusionIntelligenceAudit(context: Record<string, unknown>): void {
  console.info("[fusion-intelligence-audit]", context);
}
