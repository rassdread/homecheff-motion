import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import {
  fusionIntentDefinition,
  normalizeFusionIntent,
} from "@/lib/editor-image-fusion-catalog";
import {
  isTransformationEligibleIntent,
} from "@/lib/editor-transformation-session";
import type {
  EditorReferenceRoleSpec,
  EditorWorkflowReferenceConfig,
} from "@/types/editor-reference-role-flow";
import {
  EDITOR_REFERENCE_SEQUENCE_PRESETS,
  EDITOR_REFERENCE_VARIATION_PRESETS,
} from "@/types/editor-reference-role-flow";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorTransformationStepCount } from "@/types/editor-generation-access";

const VARIATION_INTENTS = new Set<EditorFusionIntent>([
  "product_family",
  "campaign_variant",
  "custom_composition",
  "ad_composition",
  "character_fusion",
  "animal_fusion",
  "product_branding",
  "product_environment",
]);

const MULTI_INSTANCE_ROLES: Partial<Record<EditorFusionIntent, Partial<Record<string, number>>>> = {
  fantasy_creature: { creature: 3, ref_a: 3, ref_b: 3 },
  animal_fusion: { animal: 3, animal_a: 3, animal_b: 3 },
  product_branding: { product: 3 },
  ad_composition: { product: 3, person: 2, background: 2 },
};

function maxInstancesForRole(intent: EditorFusionIntent, roleId: string, role: string): number {
  const normalized = normalizeFusionIntent(intent);
  const overrides = MULTI_INSTANCE_ROLES[normalized];
  if (overrides?.[roleId]) {
    return overrides[roleId]!;
  }
  if (overrides?.[role]) {
    return overrides[role]!;
  }
  return 1;
}

function roleSpecsFromIntent(intent: EditorFusionIntent): EditorReferenceRoleSpec[] {
  const def = fusionIntentDefinition(intent);
  return def.uploadSteps.map((step) => ({
    id: step.id,
    role: step.role,
    labelKey: step.labelKey,
    hintKey: step.hintKey,
    required: !step.optional,
    maxInstances: maxInstancesForRole(intent, step.id, step.role),
  }));
}

function supportsVariations(intent: EditorFusionIntent): boolean {
  const normalized = normalizeFusionIntent(intent);
  const def = fusionIntentDefinition(normalized);
  if (def.supportsVariations !== undefined) {
    return def.supportsVariations;
  }
  if (VARIATION_INTENTS.has(normalized)) {
    return true;
  }
  return def.category === "products_brands" || def.category === "marketing_content";
}

function supportsSequences(intent: EditorFusionIntent): boolean {
  const normalized = normalizeFusionIntent(intent);
  const def = fusionIntentDefinition(normalized);
  if (def.supportsSequences !== undefined) {
    return def.supportsSequences;
  }
  return isTransformationEligibleIntent(normalized);
}

function supportsMotionHandoff(intent: EditorFusionIntent): boolean {
  const normalized = normalizeFusionIntent(intent);
  const def = fusionIntentDefinition(normalized);
  if (def.supportsMotionHandoff !== undefined) {
    return def.supportsMotionHandoff;
  }
  return supportsSequences(normalized);
}

export function workflowReferenceConfigForIntent(
  intent: EditorFusionIntent
): EditorWorkflowReferenceConfig {
  const normalized = normalizeFusionIntent(intent);
  const roles = roleSpecsFromIntent(normalized);
  const sequences = supportsSequences(normalized);
  return {
    workflow: "combine",
    intent: normalized,
    roles,
    requiredRoles: roles.filter((r) => r.required).map((r) => r.id),
    optionalRoles: roles.filter((r) => !r.required).map((r) => r.id),
    supportsVariations: supportsVariations(normalized),
    supportsSequences: sequences,
    supportsMotionHandoff: supportsMotionHandoff(normalized),
    variationPresets: [...EDITOR_REFERENCE_VARIATION_PRESETS],
    sequencePresets: [...EDITOR_REFERENCE_SEQUENCE_PRESETS] as EditorTransformationStepCount[],
  };
}

export function workflowReferenceConfigForMode(
  mode: EditorPostUploadMode
): EditorWorkflowReferenceConfig {
  if (mode === "combine") {
    return workflowReferenceConfigForIntent("custom_composition");
  }

  const sourceRole: EditorReferenceRoleSpec = {
    id: "source",
    role: "source",
    labelKey: "editor.fusion.upload.source",
    hintKey: "editor.referenceRole.sourceHint",
    required: true,
    maxInstances: 1,
  };

  return {
    workflow: mode,
    roles: [sourceRole],
    requiredRoles: [sourceRole.id],
    optionalRoles: [],
    supportsVariations: false,
    supportsSequences: mode === "motion_prepare",
    supportsMotionHandoff: mode === "motion_prepare",
    variationPresets: [...EDITOR_REFERENCE_VARIATION_PRESETS],
    sequencePresets: [...EDITOR_REFERENCE_SEQUENCE_PRESETS] as EditorTransformationStepCount[],
  };
}

export function resolveWorkflowReferenceConfig(input: {
  workflow: EditorPostUploadMode;
  intent?: EditorFusionIntent;
}): EditorWorkflowReferenceConfig {
  if (input.workflow === "combine" && input.intent) {
    return workflowReferenceConfigForIntent(input.intent);
  }
  return workflowReferenceConfigForMode(input.workflow);
}
