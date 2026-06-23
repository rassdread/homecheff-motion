/**
 * Sprint CC0–CC14 — Character Consistency Audit (no new AI calls).
 */

import { formatEnrichedFusionBlueprintTraitLines } from "@/lib/editor-fusion-blueprint";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import {
  buildFusionIntelligencePrompt,
  buildFusionRenderPayload,
} from "@/lib/editor-fusion-render-payload";
import { ensureFusionPlan, getFusionPlan } from "@/lib/editor-fusion-plan";
import { fusionWorkflowUsesIntelligence } from "@/lib/editor-fusion-workflow-credits";
import {
  buildCharacterConsistencyRenderInstructions,
  getCharacterConsistencyRuleSet,
} from "@/lib/character-consistency-rule-engine";
import { computeCharacterConsistencyScore, buildCharacterConsistencyDiagnosticExport } from "@/lib/character-consistency-score";
import type { FusionRenderPayload, ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";
import type {
  CharacterAttributeCoverageReport,
  CharacterAttributeKey,
  CharacterBlueprintAudit,
  CharacterConsistencyAuditReport,
  CharacterDriftItem,
  CharacterDriftReport,
  CharacterPayloadCoverageReport,
  CharacterPromptCoverageReport,
  CharacterTraceReport,
  CharacterTraceStep,
  CharacterWorkflowCoverageMatrix,
} from "@/types/character-consistency-audit";
import { CHARACTER_CONSISTENCY_WORKFLOWS } from "@/types/character-consistency-audit";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const TRACE_ATTRIBUTES: CharacterAttributeKey[] = [
  "eyes",
  "eye_color",
  "glasses",
  "beard",
  "hair_color",
  "clothing",
  "accessories",
  "style_dna",
  "mascot_emblem",
  "mascot_palette",
];

function hasPremiumAnalysis(document: EditorCanvasDocument): boolean {
  return Boolean(
    document.visionV6Meta?.openAiPartsUsed ||
      (document.visionV6Meta?.mergedAnalysisParts?.length ?? 0) > 0 ||
      document.visionAnalysis?.confidence
  );
}

function promptMentions(prompt: string, value: string): boolean {
  if (!value.trim()) return false;
  return prompt.toLowerCase().includes(value.toLowerCase());
}

function collectPromptCoverageItems(
  profiles: ReferenceAnalysisProfile[],
  prompt: string
): CharacterPromptCoverageReport["items"] {
  const items: CharacterPromptCoverageReport["items"] = [];
  for (const profile of profiles) {
    const person = profile.personConsistency;
    if (!person) continue;
    if (person.eyes || person.eyeColor) {
      const value = person.eyeColor ?? person.eyes ?? "";
      items.push({
        attribute: "eyes",
        availableValue: value,
        usedInPrompt: promptMentions(prompt, value) || promptMentions(prompt, "Eyes:"),
      });
    }
    if (person.hairColor || person.hairStyle) {
      const value = person.hairColor ?? person.hairStyle ?? "";
      items.push({
        attribute: "hair",
        availableValue: value,
        usedInPrompt: promptMentions(prompt, value) || promptMentions(prompt, "Hair:"),
      });
    }
    if (person.glasses !== undefined) {
      items.push({
        attribute: "glasses",
        availableValue: person.glasses ? "yes" : "no",
        usedInPrompt: promptMentions(prompt, "glasses"),
      });
    }
    if (person.beard) {
      items.push({
        attribute: "beard",
        availableValue: "yes",
        usedInPrompt: promptMentions(prompt, "beard"),
      });
    }
    const clothing = Object.values(person.clothing).filter(Boolean).join(", ");
    if (clothing) {
      items.push({
        attribute: "clothing",
        availableValue: clothing,
        usedInPrompt: promptMentions(prompt, clothing) || promptMentions(prompt, "Clothing:"),
      });
    }
    const accessories = Object.values(person.accessories).filter(Boolean).join(", ");
    if (accessories) {
      items.push({
        attribute: "accessories",
        availableValue: accessories,
        usedInPrompt: promptMentions(prompt, accessories) || promptMentions(prompt, "Accessories:"),
      });
    }
    if (person.styleDnaSummary) {
      items.push({
        attribute: "style_dna",
        availableValue: person.styleDnaSummary,
        usedInPrompt: promptMentions(prompt, person.styleDnaSummary.slice(0, 20)),
      });
    }
    const mascot = profile.mascotConsistency;
    if (mascot?.emblems.length) {
      items.push({
        attribute: "mascot_emblem",
        availableValue: mascot.emblems.join(", "),
        usedInPrompt: promptMentions(prompt, mascot.emblems[0] ?? ""),
      });
    }
  }
  return items;
}

export function buildCharacterAttributeCoverageReport(
  document: EditorCanvasDocument
): CharacterAttributeCoverageReport {
  const merged = document.visionV6Meta?.mergedAnalysisParts ?? [];
  const sources = [
    {
      source: "rtdetr",
      attributes: ["eyes", "clothing", "accessories"] as CharacterAttributeKey[],
      populated: (document.visionV6Meta?.rtdetrCount ?? 0) > 0,
      storedAt: ["detectedObjects"],
      readAt: ["buildReferenceAnalysisProfile"],
      usedAt: ["personConsistency"],
      lostAt: ["feedCollapse"],
    },
    {
      source: "mergedAnalysisParts",
      attributes: ["eyes", "hair_color", "clothing", "accessories", "face_shape"] as CharacterAttributeKey[],
      populated: merged.length > 0,
      storedAt: ["visionV6Meta.mergedAnalysisParts"],
      readAt: ["buildVisibleEditorPartsTree", "personConsistency"],
      usedAt: ["ReferenceAnalysisProfile", "FusionBlueprint"],
      lostAt: [],
      count: merged.length,
    },
    {
      source: "styleDNA",
      attributes: ["style_dna", "mascot_palette"] as CharacterAttributeKey[],
      populated: Boolean(document.visionAnalysis?.visualStyle),
      storedAt: ["visionAnalysis"],
      readAt: ["mapVisionAnalysisToStyleDna"],
      usedAt: ["personConsistency.styleDnaSummary"],
      lostAt: [],
    },
    {
      source: "ReferenceAnalysisProfile",
      attributes: ["eyes", "eye_color", "glasses", "beard", "hair_color", "clothing", "accessories"] as CharacterAttributeKey[],
      populated: hasPremiumAnalysis(document),
      storedAt: ["fusionIntelligence.referenceProfiles"],
      readAt: ["buildFusionRenderPayload"],
      usedAt: ["prompt", "provider"],
      lostAt: [],
    },
    {
      source: "FusionBlueprint",
      attributes: ["eyes", "hair_color", "clothing", "accessories", "mascot_emblem"] as CharacterAttributeKey[],
      populated: Boolean(document.instructionStudioState?.fusionIntelligence?.blueprint),
      storedAt: ["fusionIntelligence.blueprint"],
      readAt: ["buildFusionIntelligencePrompt"],
      usedAt: ["traitAssignments"],
      lostAt: ["genericReferenceKeys"],
    },
    {
      source: "VisionTargetPicker",
      attributes: ["mascot_emblem", "clothing"] as CharacterAttributeKey[],
      populated: merged.length > 0 || (document.visionHierarchy?.length ?? 0) > 0,
      storedAt: ["visionHierarchy", "mergedAnalysisParts"],
      readAt: ["buildVisionTargetTreeFromDocument"],
      usedAt: ["mascotConsistency.emblems"],
      lostAt: [],
    },
  ];

  return { sources, generatedAt: new Date().toISOString() };
}

export function buildCharacterTraceReport(input: {
  document: EditorCanvasDocument;
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  payload?: FusionRenderPayload;
  prompt?: string;
}): CharacterTraceReport {
  const hasAnalysis = hasPremiumAnalysis(input.document);
  const hasProfile = input.profiles.some((p) => p.personConsistency);
  const hasBlueprint = Boolean(input.payload?.blueprint);
  const hasPayload = Boolean(input.payload);
  const prompt = input.prompt ?? "";

  const steps: CharacterTraceStep[] = [];

  for (const attribute of TRACE_ATTRIBUTES) {
    const available = input.profiles.some((profile) => {
      const person = profile.personConsistency;
      const mascot = profile.mascotConsistency;
      if (attribute === "eyes") return Boolean(person?.eyes);
      if (attribute === "eye_color") return Boolean(person?.eyeColor);
      if (attribute === "glasses") return person?.glasses !== undefined;
      if (attribute === "beard") return person?.beard !== undefined;
      if (attribute === "hair_color") return Boolean(person?.hairColor);
      if (attribute === "clothing") return Object.values(person?.clothing ?? {}).some(Boolean);
      if (attribute === "accessories")
        return (
          Object.values(person?.accessories ?? {}).some(Boolean) ||
          (profile.enrichment?.accessoryItems.length ?? 0) > 0
        );
      if (attribute === "style_dna") return Boolean(person?.styleDnaSummary);
      if (attribute === "mascot_emblem") return (mascot?.emblems.length ?? 0) > 0;
      if (attribute === "mascot_palette") return (mascot?.colorPalette.length ?? 0) > 0;
      return false;
    });

    const usedInPrompt = collectPromptCoverageItems(input.profiles, prompt).some(
      (item) => item.attribute === attribute.replace("_", " ") || item.usedInPrompt
    );

    steps.push({
      stage: "prompt",
      attribute,
      available,
      stored: hasProfile,
      used: usedInPrompt,
      lost: available && !usedInPrompt,
      ignored: !available,
    });

    steps.push({
      stage: "fusion_blueprint",
      attribute,
      available,
      stored: hasBlueprint,
      used: hasBlueprint && Boolean(input.payload?.blueprint.traitAssignments[attribute.replace("_", "")]),
      lost: available && hasBlueprint && !input.payload?.blueprint.traitAssignments[attribute],
      ignored: !hasAnalysis,
    });

    steps.push({
      stage: "render_payload",
      attribute,
      available,
      stored: hasPayload,
      used: hasPayload && input.profiles.some((p) => p.personConsistency),
      lost: available && hasPayload && !usedInPrompt,
      ignored: false,
    });
  }

  return {
    workflow: input.workflow,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCharacterWorkflowCoverageMatrix(
  document?: EditorCanvasDocument
): CharacterWorkflowCoverageMatrix {
  const analysisPresent = document ? hasPremiumAnalysis(document) : false;

  const workflows = CHARACTER_CONSISTENCY_WORKFLOWS.map((workflow) => {
    const usesIntelligence = fusionWorkflowUsesIntelligence(workflow as EditorFusionIntent);
    const rules = getCharacterConsistencyRuleSet(workflow as EditorFusionIntent);
    return {
      workflow,
      attributeAvailable: analysisPresent,
      attributeUsed: analysisPresent && usesIntelligence,
      inPrompt: usesIntelligence && rules.rules.length > 0,
      inPayload: usesIntelligence,
      notes: rules.rules.length > 0 ? `consistency_rules:${rules.rules.length}` : "no_rules",
    };
  });

  return { workflows, generatedAt: new Date().toISOString() };
}

export function buildCharacterPromptCoverageReport(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  prompt: string;
}): CharacterPromptCoverageReport {
  const items = collectPromptCoverageItems(input.profiles, input.prompt);
  const used = items.filter((i) => i.usedInPrompt).length;
  const coveragePercent = items.length > 0 ? Math.round((used / items.length) * 100) : 100;
  const genericPromptLoss =
    /preserve appearance/i.test(input.prompt) && items.length > 0 && used < items.length;

  return {
    workflow: input.workflow,
    coveragePercent,
    items,
    genericPromptLoss,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCharacterBlueprintAudit(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  payload: FusionRenderPayload;
}): CharacterBlueprintAudit {
  const enrichedLines = formatEnrichedFusionBlueprintTraitLines(
    input.payload.blueprint,
    input.profiles
  );
  const enrichedCharacterBlocks = enrichedLines.filter((line) => line.includes("—")).length;

  const availableAttrs = new Set<string>();
  for (const profile of input.profiles) {
    const person = profile.personConsistency;
    if (person?.eyes) availableAttrs.add("eyes");
    if (person?.hairColor) availableAttrs.add("hair_color");
    if (person?.glasses) availableAttrs.add("glasses");
    if (person?.beard) availableAttrs.add("beard");
    if (Object.values(person?.clothing ?? {}).some(Boolean)) availableAttrs.add("clothing");
    if (Object.values(person?.accessories ?? {}).some(Boolean)) availableAttrs.add("accessories");
  }

  const filledAttributes = Object.keys(input.payload.blueprint.traitAssignments);
  const missingAttributes = [...availableAttrs].filter(
    (attr) => !filledAttributes.some((filled) => filled.toLowerCase().includes(attr.replace("_", "")))
  );
  const ignoredAttributes = missingAttributes;

  return {
    workflow: input.workflow,
    filledAttributes,
    missingAttributes,
    ignoredAttributes,
    unusedFilledAttributes: input.payload.blueprint.styleNotes.length > 0 ? [] : ["styleNotes"],
    enrichedCharacterBlocks,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCharacterPayloadCoverageReport(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  payload: FusionRenderPayload;
}): CharacterPayloadCoverageReport {
  const ruleSet = getCharacterConsistencyRuleSet(input.workflow);
  const attributesInPayload: string[] = [];
  for (const profile of input.profiles) {
    const person = profile.personConsistency;
    if (person?.eyeColor) attributesInPayload.push("eye_color");
    if (person?.hairColor) attributesInPayload.push("hair_color");
    if (person?.glasses) attributesInPayload.push("glasses");
    if (Object.values(person?.clothing ?? {}).some(Boolean)) attributesInPayload.push("clothing");
    if (profile.mascotConsistency?.emblems.length) attributesInPayload.push("mascot_emblem");
  }

  const checks = [
    input.profiles.length > 0,
    input.profiles.some((p) => p.personConsistency),
    attributesInPayload.length > 0,
    ruleSet.rules.length > 0,
    input.payload.referenceAnalysis.length > 0,
  ];
  const coveragePercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    workflow: input.workflow,
    profileCount: input.profiles.length,
    personProfiles: input.profiles.filter((p) => p.personConsistency).length,
    mascotProfiles: input.profiles.filter((p) => p.mascotConsistency?.emblems.length).length,
    consistencyRulesApplied: ruleSet.rules.length,
    attributesInPayload: [...new Set(attributesInPayload)],
    coveragePercent,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCharacterDriftReport(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  prompt: string;
}): CharacterDriftReport {
  const items: CharacterDriftItem[] = collectPromptCoverageItems(input.profiles, input.prompt).map(
    (row) => ({
      attribute: row.attribute,
      availableValue: row.availableValue,
      presentInPrompt: row.usedInPrompt,
      drift: !row.usedInPrompt,
    })
  );

  return {
    workflow: input.workflow,
    items,
    driftCount: items.filter((i) => i.drift).length,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCharacterConsistencyAuditReport(input: {
  document: EditorCanvasDocument;
  profiles?: ReferenceAnalysisProfile[];
}): CharacterConsistencyAuditReport {
  const document = ensureFusionPlan(input.document);
  const plan = getFusionPlan(document);
  if (!plan) {
    throw new Error("Fusion plan required for character consistency audit");
  }
  const workflow = plan.intent;

  const profiles =
    input.profiles ??
    document.instructionStudioState?.fusionIntelligence?.referenceProfiles ??
    [
      buildReferenceAnalysisProfile({
        document,
        referenceId: "primary",
        premiumCached: hasPremiumAnalysis(document),
      }),
    ];

  const payload = buildFusionRenderPayload({ document, plan, profiles });
  const prompt = buildFusionIntelligencePrompt(payload);

  const attributeCoverage = buildCharacterAttributeCoverageReport(document);
  const trace = buildCharacterTraceReport({ document, workflow, profiles, payload, prompt });
  const workflowMatrix = buildCharacterWorkflowCoverageMatrix(document);
  const promptCoverage = buildCharacterPromptCoverageReport({ workflow, profiles, prompt });
  const blueprintAudit = buildCharacterBlueprintAudit({ workflow, profiles, payload });
  const payloadCoverage = buildCharacterPayloadCoverageReport({ workflow, profiles, payload });
  const drift = buildCharacterDriftReport({ workflow, profiles, prompt });

  const score = computeCharacterConsistencyScore({
    workflow,
    profiles,
    promptCoverage,
    blueprintAudit,
    payloadCoverage,
    drift,
  });

  return {
    workflow,
    trace,
    attributeCoverage,
    workflowMatrix,
    promptCoverage,
    blueprintAudit,
    payloadCoverage,
    drift,
    score,
    generatedAt: new Date().toISOString(),
  };
}

export { buildCharacterConsistencyDiagnosticExport } from "@/lib/character-consistency-score";
