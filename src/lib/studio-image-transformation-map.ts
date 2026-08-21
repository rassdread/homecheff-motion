/**
 * S2B.1 — Adapters from existing wizards/presets/UPC onto ImageTransformationIntent.
 * Does not change wizard UI. Uses structured IDs only (NL/EN parity).
 */

import { fingerprintMediaPointer } from "@/lib/studio-production-fingerprint";
import {
  EDITOR_FUSION_INTENT_DEFINITIONS,
  fusionIntentDefinition,
  normalizeFusionIntent,
} from "@/lib/editor-image-fusion-catalog";
import {
  canonicalRoleFromWizardSlot,
  defaultChangeTargets,
  fusionIntentToFamily,
  fusionIntentToOperation,
  morphActionToFamily,
  morphActionToOperation,
  negativeTransferForRole,
  protectionFromFusionRules,
} from "@/lib/studio-image-transformation-roles";
import { getUpcScene } from "@/lib/studio-unified-production-context";
import {
  getActionPresetRequirement,
  listRequirementsForPreset,
} from "@/lib/action-preset-requirements";
import type { ActionPresetRequirementId } from "@/types/action-preset-requirements";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import { getProductExperience } from "@/lib/studio-creative-director/product-experience-registry";
import { EDITOR_MORPH_ACTION_REGISTRY, type EditorMorphActionId } from "@/lib/editor-morph-actions";
import type { EditorFusionIntent, EditorInstructionDynamicAction } from "@/types/editor-instruction-studio";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { UnifiedProductionContext } from "@/types/studio-unified-production-context";
import {
  IMAGE_TRANSFORMATION_VERSION,
  type ImageTransformationAsset,
  type ImageTransformationFamily,
  type ImageTransformationIntent,
  type ImageTransformationOperation,
  type ImageTransformationOrigin,
  type ImageTransformationRole,
  type ImageMaskHint,
} from "@/types/studio-image-transformation";

export type TransformationSlotInput = {
  slotId: string;
  role: string;
  url?: string | null;
  assetId?: string | null;
  required?: boolean;
  maskPointer?: string | null;
};

function assetFromSlot(
  slot: TransformationSlotInput,
  canonical: ImageTransformationRole,
  required: boolean,
  operation?: ImageTransformationOperation
): ImageTransformationAsset {
  const neg = negativeTransferForRole(canonical);
  const productExact =
    canonical === "PRODUCT_REFERENCE" &&
    (operation === "PRODUCT_PRESERVE" || operation === "LOGO_PRESERVE");
  return {
    assetId: slot.assetId?.trim() || slot.slotId,
    role: canonical,
    pointer: fingerprintMediaPointer(slot.url ?? null),
    sourceSlotId: slot.slotId,
    sourceEntityId: slot.assetId?.trim() || undefined,
    required,
    transferAllowed: neg.transfer,
    exactness:
      canonical === "LOGO_REFERENCE" || productExact
        ? "MUST_PRESERVE"
        : canonical === "PRODUCT_REFERENCE"
          ? "SHOULD_MATCH"
          : canonical === "CLOTHING_REFERENCE" || canonical === "IDENTITY_REFERENCE"
            ? "SHOULD_MATCH"
            : "STYLE_REFERENCE_ONLY",
  };
}

function pickBase(
  assets: ImageTransformationAsset[],
  explicitBaseSlotId?: string | null,
  operation?: ImageTransformationOperation
): ImageTransformationAsset | null {
  if (explicitBaseSlotId) {
    const hit = assets.find((a) => a.sourceSlotId === explicitBaseSlotId);
    if (hit && hit.role !== "CLOTHING_REFERENCE") {
      return { ...hit, role: "BASE" };
    }
  }
  if (
    operation === "CLOTHING_TRANSFER" ||
    operation === "EXPRESSION_CHANGE" ||
    operation === "POSE_CHANGE" ||
    operation === "HAIR_CHANGE" ||
    operation === "LOCATION_TRANSFER" ||
    operation === "BACKGROUND_REPLACE"
  ) {
    const identity = assets.find((a) => a.role === "IDENTITY_REFERENCE");
    if (identity) {
      return { ...identity, role: "BASE" };
    }
  }
  if (operation === "LOGO_PRESERVE" || operation === "PRODUCT_PRESERVE") {
    const product = assets.find((a) => a.role === "PRODUCT_REFERENCE");
    if (product) {
      return { ...product, role: "BASE" };
    }
    const identity = assets.find((a) => a.role === "IDENTITY_REFERENCE");
    if (identity) {
      return { ...identity, role: "BASE" };
    }
  }
  const identity = assets.find((a) => a.role === "IDENTITY_REFERENCE" && a.required);
  if (identity) {
    return { ...identity, role: "BASE" };
  }
  const anyIdentity = assets.find((a) => a.role === "IDENTITY_REFERENCE");
  if (anyIdentity) {
    return { ...anyIdentity, role: "BASE" };
  }
  const product = assets.find((a) => a.role === "PRODUCT_REFERENCE" && a.required);
  if (product) {
    return { ...product, role: "BASE" };
  }
  const firstRequired = assets.find((a) => a.required && a.role !== "CLOTHING_REFERENCE");
  if (firstRequired) {
    return { ...firstRequired, role: "BASE" };
  }
  return assets[0] ? { ...assets[0], role: "BASE" } : null;
}

function masksFromSlots(slots: TransformationSlotInput[]): ImageMaskHint[] {
  return slots
    .filter((s) => s.maskPointer)
    .map((s) => {
      const role = canonicalRoleFromWizardSlot(s.role, s.slotId);
      const region =
        role === "CLOTHING_REFERENCE"
          ? "CLOTHING_REGION"
          : role === "FACE_REFERENCE"
            ? "FACE_REGION"
            : role === "LOCATION_REFERENCE"
              ? "PERSON_FOREGROUND"
              : role === "LOGO_REFERENCE"
                ? "LOGO_PLACEMENT"
                : role === "PRODUCT_REFERENCE"
                  ? "PRODUCT_REGION"
                  : "OBJECT_REGION";
      return {
        region,
        purpose: "change" as const,
        pointer: fingerprintMediaPointer(s.maskPointer ?? null),
        source: "segmentation" as const,
      };
    });
}

export function mapFusionWizardToTransformationIntent(input: {
  intentId: EditorFusionIntent;
  slots: TransformationSlotInput[];
  baseSlotId?: string | null;
  origin?: ImageTransformationOrigin;
}): ImageTransformationIntent {
  const normalized = normalizeFusionIntent(input.intentId);
  const def = fusionIntentDefinition(normalized);
  const operation = fusionIntentToOperation(normalized);
  const family = fusionIntentToFamily(normalized);
  const requiredIds = new Set(def.uploadSteps.filter((s) => !s.optional).map((s) => s.id));

  const assets: ImageTransformationAsset[] = [];
  for (const step of def.uploadSteps) {
    const supplied = input.slots.filter((s) => s.slotId === step.id || s.role === step.role);
    const canonical = canonicalRoleFromWizardSlot(step.role, step.id);
    if (!canonical) {
      continue;
    }
    if (supplied.length === 0) {
      continue;
    }
    for (const slot of supplied) {
      assets.push(assetFromSlot(slot, canonical, requiredIds.has(step.id) && !step.optional, operation));
    }
  }
  for (const slot of input.slots) {
    if (assets.some((a) => a.sourceSlotId === slot.slotId)) {
      continue;
    }
    const canonical = canonicalRoleFromWizardSlot(slot.role, slot.slotId);
    if (!canonical) {
      continue;
    }
    assets.push(assetFromSlot(slot, canonical, Boolean(slot.required), operation));
  }

  const base = pickBase(assets, input.baseSlotId ?? def.uploadSteps[0]?.id ?? null, operation);
  const references = assets.filter(
    (a) => !(a.assetId === base?.assetId && a.sourceSlotId === base.sourceSlotId)
  );
  const transferRules = [...new Set(references.map((r) => r.role))].map((role) => negativeTransferForRole(role));

  return {
    version: IMAGE_TRANSFORMATION_VERSION,
    operation,
    origin: input.origin ?? "FUSION_WIZARD",
    family,
    baseAsset: base,
    references,
    changeTargets: defaultChangeTargets(operation),
    protectedTargets: protectionFromFusionRules(def.defaultPreservation, operation),
    transferRules,
    negativeTransferRules: transferRules,
    masks: masksFromSlots(input.slots),
    sourceWizard: normalized,
    sourcePreset: normalized,
    allowTextOnlyFallback: false,
    providerDriftRisk: operation === "POSE_CHANGE" ? "HIGH" : "MEDIUM",
  };
}

export function mapMorphActionToTransformationIntent(input: {
  morphId: EditorMorphActionId;
  slots: TransformationSlotInput[];
}): ImageTransformationIntent {
  const def = EDITOR_MORPH_ACTION_REGISTRY[input.morphId];
  const operation = morphActionToOperation(input.morphId);
  const family = morphActionToFamily(input.morphId);
  const fusionAlias: EditorFusionIntent =
    operation === "CLOTHING_TRANSFER"
      ? "outfit_from_reference"
      : operation === "LOCATION_TRANSFER"
        ? "person_background"
        : "character_upgrade";
  const mapped = mapFusionWizardToTransformationIntent({
    intentId: fusionAlias,
    slots: input.slots.length
      ? input.slots
      : [{ slotId: "person", role: "person", required: true }],
    origin: "MORPH",
  });
  return {
    ...mapped,
    operation,
    family,
    origin: "MORPH",
    sourceWizard: def?.id ?? input.morphId,
    sourcePreset: input.morphId,
    changeTargets: defaultChangeTargets(operation),
    protectedTargets: protectionFromFusionRules(
      fusionIntentDefinition(fusionAlias).defaultPreservation,
      operation
    ),
    providerDriftRisk: operation === "POSE_CHANGE" ? "HIGH" : mapped.providerDriftRisk,
  };
}

const IMAGE_REQUIREMENT_CATEGORIES = new Set([
  "character",
  "outfit",
  "location",
  "background",
  "prop",
  "crowd",
  "vehicle",
  "mascot",
  "logo",
]);

function requirementToRole(requirementId: string): ImageTransformationRole | null {
  const spec = getActionPresetRequirement(requirementId as ActionPresetRequirementId);
  if (!spec || !IMAGE_REQUIREMENT_CATEGORIES.has(spec.category)) {
    return null;
  }
  const category = spec.category;
  if (requirementId === "person_character" || category === "character" || category === "mascot") {
    return "IDENTITY_REFERENCE";
  }
  if (category === "outfit" || requirementId.includes("outfit")) {
    return "CLOTHING_REFERENCE";
  }
  if (category === "location" || category === "background" || requirementId === "red_carpet") {
    return "LOCATION_REFERENCE";
  }
  if (category === "logo") {
    return "LOGO_REFERENCE";
  }
  if (category === "prop" || category === "vehicle" || category === "crowd") {
    return "OBJECT_REFERENCE";
  }
  return null;
}

export function mapMotionPresetToTransformationIntent(input: {
  presetId: MotionActionPresetId;
  slots: TransformationSlotInput[];
}): ImageTransformationIntent {
  const preset = getMotionActionPreset(input.presetId);
  const requirements = listRequirementsForPreset(input.presetId);
  const isRedCarpet = input.presetId === "red_carpet_moment" || input.presetId === "luxury_entrance";
  const family: ImageTransformationFamily = isRedCarpet
    ? "RED_CARPET_CELEBRITY"
    : preset?.category === "business"
      ? "COMMERCIAL_PRODUCT"
      : "MOTION_ONLY";
  const operation: ImageTransformationOperation = isRedCarpet
    ? "LOCATION_TRANSFER"
    : family === "COMMERCIAL_PRODUCT"
      ? "PRODUCT_PRESERVE"
      : "MOTION_ONLY";

  const assets: ImageTransformationAsset[] = [];
  const seen = new Set<string>();
  for (const slot of input.slots) {
    const canonical = canonicalRoleFromWizardSlot(slot.role, slot.slotId) ?? requirementToRole(slot.slotId);
    if (!canonical) {
      continue;
    }
    seen.add(slot.slotId);
    assets.push(assetFromSlot(slot, canonical, Boolean(slot.required)));
  }
  for (const req of requirements) {
    if (seen.has(req.id) || !IMAGE_REQUIREMENT_CATEGORIES.has(req.category)) {
      continue;
    }
    const supplied = input.slots.find((s) => s.slotId === req.id);
    if (!supplied) {
      continue;
    }
    const canonical = requirementToRole(req.id);
    if (!canonical) {
      continue;
    }
    assets.push(assetFromSlot(supplied, canonical, req.required));
  }
  if (!assets.some((a) => a.role === "IDENTITY_REFERENCE")) {
    const person = input.slots.find(
      (s) => s.slotId === "person" || s.slotId === "person_character" || s.role === "person"
    );
    if (person) {
      assets.push(assetFromSlot(person, "IDENTITY_REFERENCE", true));
    }
  }

  const base = pickBase(assets, "person_character", operation);
  const references = assets.filter(
    (a) => !(a.assetId === base?.assetId && a.sourceSlotId === base.sourceSlotId)
  );
  const transferRules = [...new Set(references.map((r) => r.role))].map((role) => negativeTransferForRole(role));
  const fusionPreserve = fusionIntentDefinition("person_background").defaultPreservation;
  const protectOp = operation === "MOTION_ONLY" ? "LOCATION_TRANSFER" : operation;

  return {
    version: IMAGE_TRANSFORMATION_VERSION,
    operation,
    origin: "MOTION_PRESET",
    family,
    baseAsset: base,
    references,
    changeTargets: defaultChangeTargets(protectOp),
    protectedTargets: protectionFromFusionRules(fusionPreserve, protectOp),
    transferRules,
    negativeTransferRules: transferRules,
    masks: masksFromSlots(input.slots),
    sourceWizard: input.presetId,
    sourcePreset: input.presetId,
    styleIntent: preset?.styleSettings.visualStyle ?? null,
    compositionIntent: preset?.sceneSettings.environment ?? null,
    allowTextOnlyFallback: false,
    providerDriftRisk: "MEDIUM",
  };
}

export function mapProductExperienceToTransformationIntent(input: {
  experienceId: StudioProductExperienceId;
  slots: TransformationSlotInput[];
}): ImageTransformationIntent {
  const entry = getProductExperience(input.experienceId);
  let operation: ImageTransformationOperation = "IDENTITY_PRESERVING_EDIT";
  let family: ImageTransformationFamily = "PERSON_TRANSFORM";
  let origin: ImageTransformationOrigin = "EXPERIENCE_PACK";
  let fusionId: EditorFusionIntent | null = null;

  if (input.experienceId === "IDENTITY_OUTFIT") {
    operation = "CLOTHING_TRANSFER";
    family = "OUTFIT";
    fusionId = "outfit_from_reference";
  } else if (input.experienceId === "IDENTITY_PERSON_BACKGROUND" || entry.matrixExperienceId === "PERSON_BACKGROUND") {
    operation = "LOCATION_TRANSFER";
    family = "LOCATION_BACKGROUND";
    fusionId = "person_background";
  } else if (input.experienceId === "PEOPLE_RED_CARPET" || input.experienceId === "PEOPLE_CELEBRITY") {
    operation = "LOCATION_TRANSFER";
    family = "RED_CARPET_CELEBRITY";
    origin = "EXPERIENCE_PACK";
  } else if (input.experienceId === "BUSINESS_LOGO_PLACEMENT") {
    operation = "LOGO_PRESERVE";
    family = "LOGO_BRANDING";
    fusionId = "product_branding";
    origin = "COMMERCIAL_FLOW";
  } else if (
    input.experienceId === "BUSINESS_PRODUCT" ||
    input.experienceId === "BUSINESS_BRANDING" ||
    input.experienceId === "BUSINESS_COMMERCIAL" ||
    input.experienceId === "BUSINESS_ADVERTISEMENT"
  ) {
    operation = "PRODUCT_PRESERVE";
    family = "COMMERCIAL_PRODUCT";
    fusionId = "product_environment";
    origin = "COMMERCIAL_FLOW";
  } else if (input.experienceId === "IDENTITY_CHARACTER" || input.experienceId === "IDENTITY_MOTION_READY") {
    operation = "CHARACTER_REFERENCE_GENERATION";
    family = "CHARACTER";
    origin = "CHARACTER_DESIGNER";
  } else if (input.experienceId === "IDENTITY_CHARACTER_FUSION") {
    operation = "MULTI_CHARACTER_COMPOSITION";
    family = "MULTI_PERSON";
    fusionId = "character_fusion";
  } else if (entry.family === "SOCIAL") {
    operation = "MOTION_ONLY";
    family = "SOCIAL_FUN";
  } else if (entry.family === "CREATIVE") {
    operation = "FULL_SCENE_GENERATION";
    family = "STORY_CINEMATIC";
  } else if (entry.family === "PEOPLE") {
    operation = "IDENTITY_PRESERVING_EDIT";
    family = "PERSON_TRANSFORM";
  } else if (entry.providerCapabilities.length === 0) {
    family = "NOT_TRANSFORMATION_RELEVANT";
  }

  if (fusionId) {
    const mapped = mapFusionWizardToTransformationIntent({
      intentId: fusionId,
      slots: input.slots,
      origin,
    });
    return {
      ...mapped,
      operation,
      family,
      origin,
      sourceWizard: input.experienceId,
      sourcePreset: input.experienceId,
    };
  }

  const assets: ImageTransformationAsset[] = [];
  for (const slot of input.slots) {
    const canonical = canonicalRoleFromWizardSlot(slot.role, slot.slotId);
    if (!canonical) {
      continue;
    }
    assets.push(assetFromSlot(slot, canonical, Boolean(slot.required), operation));
  }
  for (const assetId of [...entry.requiredAssets, ...entry.optionalAssets]) {
    const slot = input.slots.find((s) => s.slotId === assetId);
    if (!slot || assets.some((a) => a.sourceSlotId === slot.slotId)) {
      continue;
    }
    const canonical = canonicalRoleFromWizardSlot(assetId, assetId);
    if (!canonical) {
      continue;
    }
    assets.push(
      assetFromSlot(
        { ...slot, required: entry.requiredAssets.includes(assetId) },
        canonical,
        entry.requiredAssets.includes(assetId),
        operation
      )
    );
  }
  if (entry.requiredAssets.includes("source_image") && !assets.some((a) => a.role === "IDENTITY_REFERENCE" || a.role === "BASE")) {
    const source = input.slots.find((s) => s.slotId === "source_image" || s.role === "person" || s.role === "source");
    if (source) {
      assets.push(assetFromSlot({ ...source, required: true }, "IDENTITY_REFERENCE", true, operation));
    }
  }
  const base = pickBase(assets, null, operation);
  const references = assets.filter(
    (a) => !(a.assetId === base?.assetId && a.sourceSlotId === base.sourceSlotId)
  );
  const transferRules = [...new Set(references.map((r) => r.role))].map((role) => negativeTransferForRole(role));

  return {
    version: IMAGE_TRANSFORMATION_VERSION,
    operation,
    origin,
    family,
    baseAsset: base,
    references,
    changeTargets: defaultChangeTargets(operation),
    protectedTargets: protectionFromFusionRules(
      fusionId ? fusionIntentDefinition(fusionId).defaultPreservation : ["face", "identity"],
      operation
    ),
    transferRules,
    negativeTransferRules: transferRules,
    masks: masksFromSlots(input.slots),
    sourceWizard: input.experienceId,
    sourcePreset: input.experienceId,
    styleIntent:
      family === "RED_CARPET_CELEBRITY"
        ? getMotionActionPreset("red_carpet_moment")?.styleSettings.visualStyle ?? "celebrity cinematic"
        : null,
    compositionIntent:
      family === "RED_CARPET_CELEBRITY"
        ? getMotionActionPreset("red_carpet_moment")?.sceneSettings.environment ?? "red carpet event"
        : null,
    allowTextOnlyFallback: family === "NOT_TRANSFORMATION_RELEVANT",
    providerDriftRisk: "MEDIUM",
  };
}

export function mapSceneRerenderToTransformationIntent(input: {
  approvedStill: { id: string; url?: string | null };
  upc?: UnifiedProductionContext | null;
  sceneId?: string | null;
  changeTargets?: ImageTransformationIntent["changeTargets"];
  extraRefs?: TransformationSlotInput[];
}): ImageTransformationIntent {
  const scene = input.upc && input.sceneId ? getUpcScene(input.upc, input.sceneId) : null;
  const base: ImageTransformationAsset = {
    assetId: input.approvedStill.id,
    role: "BASE",
    pointer: fingerprintMediaPointer(input.approvedStill.url ?? null),
    required: true,
    transferAllowed: [],
  };
  const references: ImageTransformationAsset[] = [];
  if (input.upc) {
    for (const character of input.upc.characters.filter((c) => !scene || scene.characterIds.includes(c.id))) {
      if (character.referenceIdentity.primaryUrl) {
        references.push({
          assetId: character.id,
          role: "IDENTITY_REFERENCE",
          pointer: fingerprintMediaPointer(character.referenceIdentity.primaryUrl),
          sourceEntityId: character.id,
          required: true,
          transferAllowed: [],
          exactness: "SHOULD_MATCH",
        });
      }
    }
    for (const location of input.upc.locations.filter((l) => !scene || scene.locationId === l.id)) {
      if (location.referenceUrl) {
        references.push({
          assetId: location.id,
          role: "LOCATION_REFERENCE",
          pointer: fingerprintMediaPointer(location.referenceUrl),
          sourceEntityId: location.id,
          required: false,
          transferAllowed: ["location"],
          exactness: "SHOULD_MATCH",
        });
      }
    }
    for (const prop of input.upc.props.filter((p) => !scene || scene.propIds.includes(p.id))) {
      references.push({
        assetId: prop.id,
        role: prop.kind === "logo" ? "LOGO_REFERENCE" : prop.kind === "product" ? "PRODUCT_REFERENCE" : "OBJECT_REFERENCE",
        pointer: fingerprintMediaPointer(prop.referenceUrl),
        sourceEntityId: prop.id,
        required: prop.exactness === "MUST_PRESERVE",
        transferAllowed: prop.kind === "logo" ? ["logo.artwork"] : ["product"],
        exactness: prop.exactness,
      });
    }
  }
  for (const slot of input.extraRefs ?? []) {
    const canonical = canonicalRoleFromWizardSlot(slot.role, slot.slotId);
    if (canonical) {
      references.push(assetFromSlot(slot, canonical, Boolean(slot.required)));
    }
  }

  return {
    version: IMAGE_TRANSFORMATION_VERSION,
    operation: "SCENE_RERENDER",
    origin: "SCENE_RERENDER",
    family: "STORY_CINEMATIC",
    baseAsset: base,
    references,
    changeTargets: input.changeTargets?.length ? input.changeTargets : ["scene.delta"],
    protectedTargets: [
      { property: "face identity", level: "MUST_PRESERVE" },
      { property: "product geometry", level: "MUST_PRESERVE" },
      { property: "logo artwork", level: "MUST_PRESERVE" },
    ],
    transferRules: references.map((r) => negativeTransferForRole(r.role)),
    negativeTransferRules: references.map((r) => negativeTransferForRole(r.role)),
    masks: [],
    sourceWizard: "scene_rerender",
    upcHash: input.upc?.upcHash ?? null,
    sceneContextHash: scene?.sceneContextHash ?? null,
    allowTextOnlyFallback: false,
    providerDriftRisk: "MEDIUM",
  };
}

const INSTRUCTION_ACTION_TO_OPERATION: Partial<Record<EditorInstructionDynamicAction, ImageTransformationOperation>> = {
  change_clothing: "CLOTHING_TRANSFER",
  change_expression: "EXPRESSION_CHANGE",
  change_pose: "POSE_CHANGE",
  change_background: "BACKGROUND_REPLACE",
  change_style: "STYLE_CHANGE",
  add_logo: "LOGO_PRESERVE",
  replace_logo: "LOGO_PRESERVE",
  enlarge_logo: "LOGO_PRESERVE",
  move_logo: "LOGO_PRESERVE",
  remove_logo: "LOGO_PRESERVE",
};

export function mapEditorInstructionToTransformationIntent(input: {
  action: EditorInstructionDynamicAction;
  base: TransformationSlotInput;
  slots?: TransformationSlotInput[];
}): ImageTransformationIntent {
  const operation = INSTRUCTION_ACTION_TO_OPERATION[input.action] ?? "IDENTITY_PRESERVING_EDIT";
  const family: ImageTransformationFamily =
    operation === "CLOTHING_TRANSFER"
      ? "OUTFIT"
      : operation === "LOGO_PRESERVE"
        ? "LOGO_BRANDING"
        : operation === "BACKGROUND_REPLACE"
          ? "LOCATION_BACKGROUND"
          : "PERSON_TRANSFORM";
  const mapped = mapFusionWizardToTransformationIntent({
    intentId:
      operation === "CLOTHING_TRANSFER"
        ? "outfit_from_reference"
        : operation === "BACKGROUND_REPLACE"
          ? "person_background"
          : operation === "LOGO_PRESERVE"
            ? "product_branding"
            : "character_upgrade",
    slots: [input.base, ...(input.slots ?? [])],
    origin: "EDITOR_INSTRUCTION",
  });
  return {
    ...mapped,
    operation,
    family,
    origin: "EDITOR_INSTRUCTION",
    sourceWizard: input.action,
    changeTargets: defaultChangeTargets(operation),
  };
}

export function mapCharacterFromReferenceToTransformationIntent(input: {
  sourceImageUrl?: string | null;
  sourceAssetId?: string | null;
}): ImageTransformationIntent {
  const slot: TransformationSlotInput = {
    slotId: "source",
    role: "person",
    url: input.sourceImageUrl,
    assetId: input.sourceAssetId ?? "source",
    required: true,
  };
  const mapped = mapFusionWizardToTransformationIntent({
    intentId: "character_upgrade",
    slots: [slot],
    origin: "CHARACTER_DESIGNER",
  });
  return {
    ...mapped,
    operation: "CHARACTER_REFERENCE_GENERATION",
    family: "CHARACTER",
    origin: "CHARACTER_DESIGNER",
    sourceWizard: "character_from_reference",
  };
}

export function mapLegacyToTransformationIntent(input: {
  slots: TransformationSlotInput[];
  hint?: string | null;
}): ImageTransformationIntent {
  const mapped = mapFusionWizardToTransformationIntent({
    intentId: "custom_composition",
    slots: input.slots,
    origin: "LEGACY",
  });
  return {
    ...mapped,
    origin: "LEGACY",
    sourceWizard: "legacy",
    sourcePreset: input.hint ?? "legacy",
    allowTextOnlyFallback: true,
  };
}

export function mapOutfitWizardToTransformationIntent(input: {
  slots: TransformationSlotInput[];
  origin?: ImageTransformationOrigin;
}): ImageTransformationIntent {
  return mapFusionWizardToTransformationIntent({
    intentId: "outfit_from_reference",
    slots: input.slots,
    origin: input.origin ?? "FUSION_WIZARD",
  });
}

export function fusionCatalogIntentIds(): EditorFusionIntent[] {
  return EDITOR_FUSION_INTENT_DEFINITIONS.map((d) => d.id);
}
