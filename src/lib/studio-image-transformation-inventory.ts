/**
 * S2B.1 — Derived preset/wizard inventory and coverage matrix.
 * Reads existing catalogs. Does not duplicate preset metadata.
 */

import { EDITOR_FUSION_INTENT_DEFINITIONS } from "@/lib/editor-image-fusion-catalog";
import { EDITOR_MORPH_ACTION_IDS } from "@/lib/editor-morph-actions";
import { listRequirementsForPreset } from "@/lib/action-preset-requirements";
import { getAllMotionActionPresets } from "@/lib/motion-action-presets";
import { STUDIO_PRODUCT_EXPERIENCE_IDS } from "@/lib/studio-creative-director/product-experience-ids";
import { getProductExperience } from "@/lib/studio-creative-director/product-experience-registry";
import {
  mapCharacterFromReferenceToTransformationIntent,
  mapFusionWizardToTransformationIntent,
  mapMorphActionToTransformationIntent,
  mapMotionPresetToTransformationIntent,
  mapProductExperienceToTransformationIntent,
  mapSceneRerenderToTransformationIntent,
  type TransformationSlotInput,
} from "@/lib/studio-image-transformation-map";
import { canonicalRoleFromWizardSlot } from "@/lib/studio-image-transformation-roles";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import { EDITOR_INSTRUCTION_DYNAMIC_ACTIONS } from "@/types/editor-instruction-studio";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorMorphActionId } from "@/lib/editor-morph-actions";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type {
  ImageTransformationFamily,
  ImageTransformationOrigin,
  TransformationCoverageRow,
  WizardSlotClassification,
} from "@/types/studio-image-transformation";

const NON_IMAGE_REQUIREMENT = new Set(["music", "sfx", "voice", "lighting"]);

function classifySlot(role: string, required: boolean, origin: ImageTransformationOrigin, legacy?: boolean): WizardSlotClassification {
  if (legacy || origin === "LEGACY") {
    return "LEGACY";
  }
  const canonical = canonicalRoleFromWizardSlot(role, role);
  if (!canonical) {
    return required ? "AMBIGUOUS" : "CORRECT_BUT_UNTYPED";
  }
  if (role === "object" || role === "source") {
    return "CORRECT_BUT_UNTYPED";
  }
  return "CORRECT";
}

function dummySlots(
  steps: Array<{ id: string; role: string; required: boolean }>
): TransformationSlotInput[] {
  return steps.map((step) => ({
    slotId: step.id,
    role: step.role,
    url: `https://cdn.example/${step.id}.jpg`,
    assetId: step.id,
    required: step.required,
  }));
}

function statusFor(input: {
  family: ImageTransformationFamily;
  origin: ImageTransformationOrigin;
  operation: string | null;
  missing: boolean;
  requestedEqualsActual: boolean;
  actual: string | null;
  hasClothingReference?: boolean;
  hasLocationReference?: boolean;
}): TransformationCoverageRow["status"] {
  if (input.family === "NOT_TRANSFORMATION_RELEVANT") {
    return "NOT_TRANSFORMATION_RELEVANT";
  }
  if (input.origin === "LEGACY") {
    return "LEGACY";
  }
  if (input.missing) {
    return "MISSING_INPUT";
  }
  if (!input.actual) {
    return "BLOCKED";
  }
  if (input.family === "OUTFIT" && input.hasClothingReference) {
    return input.requestedEqualsActual ? "MASKED_EXECUTION_ACTIVE" : "FUSION_FALLBACK_ACTIVE";
  }
  if (input.family === "STORY_CINEMATIC" || input.origin === "SCENE_RERENDER") {
    return input.actual === "TEXT_TO_IMAGE" ? "FRESH_T2I_LAST_RESORT" : "BASE_EDIT_ACTIVE";
  }
  if (input.family === "LOCATION_BACKGROUND") {
    if (input.actual === "SEGMENT_COMPOSITE_EDIT") {
      return "FOREGROUND_COMPOSITE_ACTIVE";
    }
    if (input.hasLocationReference) {
      return "LOCATION_REFERENCE_EDIT_ACTIVE";
    }
    return "FUSION_FALLBACK_ACTIVE";
  }
  if (input.family === "RED_CARPET_CELEBRITY") {
    return input.hasLocationReference
      ? "LOCATION_REFERENCE_EDIT_ACTIVE"
      : "GENERATIVE_BASE_EDIT_ACTIVE";
  }
  if (input.family === "COMMERCIAL_PRODUCT" || input.family === "LOGO_BRANDING") {
    if (input.actual === "PIXEL_COMPOSITE" || input.actual === "COMMERCIAL_INJECT") {
      return "PIXEL_PRESERVE_ACTIVE";
    }
    return "QA_ACTIVE";
  }
  if (!input.requestedEqualsActual) {
    return "READY_BUT_EXECUTION_WEAK";
  }
  return "ROUTER_READY";
}

function nextSliceFor(family: ImageTransformationFamily, status: TransformationCoverageRow["status"]): string | null {
  if (status === "NOT_TRANSFORMATION_RELEVANT") {
    return null;
  }
  if (family === "OUTFIT") {
    if (status === "MASKED_EXECUTION_ACTIVE" || status === "FUSION_FALLBACK_ACTIVE") {
      return null;
    }
    return "S2B.2";
  }
  if (
    family === "STORY_CINEMATIC" ||
    family === "LOCATION_BACKGROUND" ||
    family === "RED_CARPET_CELEBRITY"
  ) {
    if (
      status === "BASE_EDIT_ACTIVE" ||
      status === "LOCATION_REFERENCE_EDIT_ACTIVE" ||
      status === "FOREGROUND_COMPOSITE_ACTIVE" ||
      status === "FUSION_FALLBACK_ACTIVE" ||
      status === "GENERATIVE_BASE_EDIT_ACTIVE"
    ) {
      return null;
    }
    return "S2B.3";
  }
  if (family === "COMMERCIAL_PRODUCT" || family === "LOGO_BRANDING") {
    if (status === "PIXEL_PRESERVE_ACTIVE" || status === "QA_ACTIVE") {
      return null;
    }
    return "S2B.4";
  }
  return null;
}

function rowFromPlan(input: {
  id: string;
  source: ImageTransformationOrigin;
  slots: Array<{ slotId: string; currentRole: string; required: boolean; classification: WizardSlotClassification }>;
  intent: ReturnType<typeof mapFusionWizardToTransformationIntent>;
  currentExecutionMatchesPlan: boolean;
}): TransformationCoverageRow {
  const { plan } = routeImageTransformation(input.intent);
  const missing = plan.status === "missing_required_reference";
  const requestedEqualsActual = plan.requestedRoute === plan.actualRoute;
  const status = statusFor({
    family: input.intent.family,
    origin: input.source,
    operation: input.intent.operation,
    missing,
    requestedEqualsActual,
    actual: plan.actualRoute,
    hasClothingReference: input.intent.references.some((r) => r.role === "CLOTHING_REFERENCE"),
    hasLocationReference: input.intent.references.some((r) => r.role === "LOCATION_REFERENCE"),
  });
  return {
    id: input.id,
    source: input.source,
    family: input.intent.family,
    operation: input.intent.operation,
    uploadSlots: input.slots.map((slot) => ({
      ...slot,
      canonicalRole: canonicalRoleFromWizardSlot(slot.currentRole, slot.slotId),
    })),
    roleMapped: input.slots.every((s) => canonicalRoleFromWizardSlot(s.currentRole, s.slotId) !== null || !s.required),
    baseIdentified: Boolean(input.intent.baseAsset),
    changeIdentified: input.intent.changeTargets.length > 0 || input.intent.operation === "MOTION_ONLY",
    protectionIdentified: input.intent.protectedTargets.length > 0,
    routerPlan: plan.status === "ready" || plan.status === "legacy_inferred",
    currentExecutionMatchesPlan:
      input.intent.family === "OUTFIT" && input.intent.references.some((r) => r.role === "CLOTHING_REFERENCE")
        ? true
        : input.intent.family === "STORY_CINEMATIC" ||
            input.intent.origin === "SCENE_RERENDER" ||
            input.intent.family === "LOCATION_BACKGROUND" ||
            input.intent.family === "RED_CARPET_CELEBRITY" ||
            input.intent.family === "COMMERCIAL_PRODUCT" ||
            input.intent.family === "LOGO_BRANDING"
          ? true
          : input.currentExecutionMatchesPlan,
    nextSlice: nextSliceFor(input.intent.family, status),
    status,
  };
}

export function inventoryFusionWizards(): TransformationCoverageRow[] {
  return EDITOR_FUSION_INTENT_DEFINITIONS.map((def) => {
    const slots = def.uploadSteps.map((step) => ({
      slotId: step.id,
      currentRole: step.role,
      required: !step.optional,
      classification: classifySlot(step.role, !step.optional, def.legacy ? "LEGACY" : "FUSION_WIZARD", def.legacy),
    }));
    const intent = mapFusionWizardToTransformationIntent({
      intentId: def.id,
      slots: dummySlots(slots.map((s) => ({ id: s.slotId, role: s.currentRole, required: s.required }))),
      origin: def.legacy ? "LEGACY" : "FUSION_WIZARD",
    });
    const clothingUnmasked = intent.operation === "CLOTHING_TRANSFER";
    return rowFromPlan({
      id: `fusion:${def.id}`,
      source: def.legacy ? "LEGACY" : "FUSION_WIZARD",
      slots,
      intent,
      currentExecutionMatchesPlan: clothingUnmasked,
    });
  });
}

export function inventoryProductExperiences(): TransformationCoverageRow[] {
  return STUDIO_PRODUCT_EXPERIENCE_IDS.map((id: StudioProductExperienceId) => {
    const entry = getProductExperience(id);
    const slots = [
      ...entry.requiredAssets.map((asset) => ({
        slotId: asset,
        currentRole: asset,
        required: true,
        classification: classifySlot(asset, true, "EXPERIENCE_PACK"),
      })),
      ...entry.optionalAssets.map((asset) => ({
        slotId: asset,
        currentRole: asset,
        required: false,
        classification: classifySlot(asset, false, "EXPERIENCE_PACK"),
      })),
    ].filter((slot) => slot.currentRole !== "music" && slot.currentRole !== "brand");
    const intent = mapProductExperienceToTransformationIntent({
      experienceId: id,
      slots: dummySlots(
        slots
          .filter((s) => s.required || s.slotId === "outfit_reference" || s.slotId === "logo" || s.slotId === "source_image")
          .map((s) => ({ id: s.slotId, role: s.currentRole, required: s.required }))
      ),
    });
    const executionMatch =
      intent.family === "LOGO_BRANDING" ||
      intent.family === "OUTFIT" ||
      intent.family === "CHARACTER";
    return rowFromPlan({
      id: `experience:${id}`,
      source: intent.origin,
      slots,
      intent,
      currentExecutionMatchesPlan: executionMatch,
    });
  });
}

export function inventoryMotionPresets(): TransformationCoverageRow[] {
  return getAllMotionActionPresets().map((preset) => {
    const reqs = listRequirementsForPreset(preset.id as MotionActionPresetId).filter(
      (req) => !NON_IMAGE_REQUIREMENT.has(req.category)
    );
    const slots = reqs.map((req) => ({
      slotId: req.id,
      currentRole: req.category,
      required: req.required,
      classification: classifySlot(req.category, req.required, "MOTION_PRESET"),
    }));
    const intent = mapMotionPresetToTransformationIntent({
      presetId: preset.id,
      slots: dummySlots(slots.map((s) => ({ id: s.slotId, role: s.currentRole, required: s.required }))),
    });
    return rowFromPlan({
      id: `motion:${preset.id}`,
      source: "MOTION_PRESET",
      slots,
      intent,
      currentExecutionMatchesPlan: intent.operation === "MOTION_ONLY",
    });
  });
}

export function inventoryMorphActions(): TransformationCoverageRow[] {
  return EDITOR_MORPH_ACTION_IDS.map((id: EditorMorphActionId) => {
    const clothing = id.includes("outfit");
    const slots = clothing
      ? [
          { slotId: "person", currentRole: "person", required: true, classification: "CORRECT" as const },
          { slotId: "outfit", currentRole: "outfit", required: true, classification: "CORRECT" as const },
        ]
      : [{ slotId: "person", currentRole: "person", required: true, classification: "CORRECT" as const }];
    const intent = mapMorphActionToTransformationIntent({
      morphId: id,
      slots: dummySlots(slots.map((s) => ({ id: s.slotId, role: s.currentRole, required: s.required }))),
    });
    return rowFromPlan({
      id: `morph:${id}`,
      source: "MORPH",
      slots,
      intent,
      currentExecutionMatchesPlan: !clothing,
    });
  });
}

export function inventorySceneRerender(): TransformationCoverageRow {
  const intent = mapSceneRerenderToTransformationIntent({
    approvedStill: { id: "still-1", url: "https://cdn.example/approved.jpg" },
  });
  return rowFromPlan({
    id: "scene_rerender",
    source: "SCENE_RERENDER",
    slots: [
      {
        slotId: "approved_still",
        currentRole: "base",
        required: true,
        classification: "CORRECT",
      },
    ],
    intent,
    currentExecutionMatchesPlan: true,
  });
}

export function inventoryCharacterFromReference(): TransformationCoverageRow {
  const intent = mapCharacterFromReferenceToTransformationIntent({
    sourceImageUrl: "https://cdn.example/source.jpg",
    sourceAssetId: "source",
  });
  return rowFromPlan({
    id: "character_from_reference",
    source: "CHARACTER_DESIGNER",
    slots: [
      {
        slotId: "source",
        currentRole: "person",
        required: true,
        classification: "CORRECT",
      },
    ],
    intent,
    currentExecutionMatchesPlan: true,
  });
}

export function inventoryEditorInstructionActions(): TransformationCoverageRow[] {
  const relevant = EDITOR_INSTRUCTION_DYNAMIC_ACTIONS.filter((action) =>
    /clothing|expression|pose|background|style|logo/.test(action)
  );
  return relevant.map((action) => {
    const slots = [
      { slotId: "base", currentRole: "person", required: true, classification: "CORRECT" as const },
      ...(action.includes("clothing")
        ? [{ slotId: "outfit", currentRole: "outfit", required: true, classification: "CORRECT" as const }]
        : []),
      ...(action.includes("logo")
        ? [{ slotId: "logo", currentRole: "logo", required: true, classification: "CORRECT" as const }]
        : []),
    ];
    const fusionId: EditorFusionIntent = action.includes("clothing")
      ? "outfit_from_reference"
      : action.includes("background")
        ? "person_background"
        : action.includes("logo")
          ? "product_branding"
          : "character_upgrade";
    const intent = mapFusionWizardToTransformationIntent({
      intentId: fusionId,
      slots: dummySlots(slots.map((s) => ({ id: s.slotId, role: s.currentRole, required: s.required }))),
      origin: "EDITOR_INSTRUCTION",
    });
    return rowFromPlan({
      id: `editor:${action}`,
      source: "EDITOR_INSTRUCTION",
      slots,
      intent,
      currentExecutionMatchesPlan: action.includes("clothing"),
    });
  });
}

export function buildTransformationCoverageMatrix(): TransformationCoverageRow[] {
  return [
    ...inventoryFusionWizards(),
    ...inventoryProductExperiences(),
    ...inventoryMotionPresets(),
    ...inventoryMorphActions(),
    inventorySceneRerender(),
    inventoryCharacterFromReference(),
    ...inventoryEditorInstructionActions(),
  ];
}

export function coverageSummary(rows = buildTransformationCoverageMatrix()) {
  const byStatus: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byFamily[row.family] = (byFamily[row.family] ?? 0) + 1;
  }
  return { total: rows.length, byStatus, byFamily };
}
