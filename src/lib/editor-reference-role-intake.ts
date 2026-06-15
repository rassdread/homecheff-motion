import {
  addCompositionReference,
  analyzeCompositionReference,
} from "@/lib/editor-composition-plan";
import { patchFusionGenerationSettings } from "@/lib/editor-fusion-generation-settings";
import { seedCategoryOutputSettings } from "@/lib/editor-fusion-archetypes";
import { buildFusionOutputSettings } from "@/lib/editor-fusion-archetype-v2";
import {
  buildInheritedTraits,
  ensureFusionPlan,
  getFusionPlan,
  patchFusionPlan,
} from "@/lib/editor-fusion-plan";
import { applyWearOutfitComposition } from "@/lib/editor-wear-outfit-composition";
import { fusionIntentDefinition, normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import {
  createTransformationSession,
  fusionIntentToTransformationType,
} from "@/lib/editor-transformation-session";
import { resolveWorkflowReferenceConfig } from "@/lib/editor-workflow-reference-config";
import { buildFriendlyFileDisplay } from "@/lib/editor-friendly-file-name";
import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type { EditorCompositionReferenceType } from "@/types/editor-instruction-studio";
import type {
  EditorReferenceIntakeState,
  EditorReferenceMotionSelection,
  EditorReferenceOutputSelection,
  EditorReferenceRoleSlot,
  EditorWorkflowReferenceConfig,
} from "@/types/editor-reference-role-flow";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function roleToReferenceType(role: string): EditorCompositionReferenceType {
  if (role === "logo") {
    return "logo";
  }
  if (role === "background" || role === "environment") {
    return "background";
  }
  return "style";
}

export function createEmptyReferenceSlots(
  config: EditorWorkflowReferenceConfig
): EditorReferenceRoleSlot[] {
  return config.roles.map((role) => ({
    roleId: role.id,
    role: role.role,
    instances: [],
  }));
}

export function defaultReferenceOutputSelection(
  config: EditorWorkflowReferenceConfig
): EditorReferenceOutputSelection {
  return {
    outputMode: "single",
    variationCount: config.variationPresets[0] ?? 4,
    stepCount: config.sequencePresets[0] ?? 3,
  };
}

export function defaultReferenceMotionSelection(): EditorReferenceMotionSelection {
  return { enabled: false, durationSec: 0 };
}

export function createReferenceIntakeState(input: {
  config: EditorWorkflowReferenceConfig;
}): EditorReferenceIntakeState {
  const intent = input.config.intent;
  return {
    config: input.config,
    slots: createEmptyReferenceSlots(input.config),
    output: defaultReferenceOutputSelection(input.config),
    motion: defaultReferenceMotionSelection(),
    fusionQuestionAnswers: {},
    fusionOutputSettings: intent ? seedCategoryOutputSettings(intent) : {},
  };
}

export function referenceIntakeReady(state: EditorReferenceIntakeState): boolean {
  for (const roleId of state.config.requiredRoles) {
    const slot = state.slots.find((s) => s.roleId === roleId);
    if (!slot || slot.instances.length === 0) {
      return false;
    }
  }
  if (state.config.requiredRoles.length === 0) {
    return state.slots.some((slot) => slot.instances.length > 0);
  }
  return true;
}

export function resolvedOutputGenerationCount(output: EditorReferenceOutputSelection): number {
  if (output.outputMode === "sequence") {
    return output.customStepCount ?? output.stepCount;
  }
  if (output.outputMode === "variations") {
    return output.customVariationCount ?? output.variationCount;
  }
  return 1;
}

function primaryRoleId(config: EditorWorkflowReferenceConfig): string {
  if (config.requiredRoles[0]) {
    return config.requiredRoles[0];
  }
  return config.roles[0]?.id ?? "source";
}

function primaryBaseDocument(state: EditorReferenceIntakeState): EditorCanvasDocument | undefined {
  const primaryId = primaryRoleId(state.config);
  const primarySlot = state.slots.find((s) => s.roleId === primaryId);
  if (primarySlot?.instances[0]) {
    return primarySlot.instances[0].document;
  }
  for (const slot of state.slots) {
    if (slot.instances[0]) {
      return slot.instances[0].document;
    }
  }
  return undefined;
}

export function applyReferenceRoleIntake(
  state: EditorReferenceIntakeState
): EditorCanvasDocument {
  const { config, slots, output, motion, fusionQuestionAnswers, fusionOutputSettings } = state;
  const intent = config.intent;
  const baseDoc = primaryBaseDocument(state);
  if (!baseDoc) {
    throw new Error("Reference intake missing primary document.");
  }

  if (!intent || config.workflow !== "combine") {
    return patchNonFusionIntake(baseDoc, config, output, motion);
  }

  const normalized = normalizeFusionIntent(intent);
  const baseSessionId = baseDoc.sessionId;
  const referenceEntries: Array<{ doc: EditorCanvasDocument; role: string; roleId: string }> = [];

  for (const slot of slots) {
    for (const instance of slot.instances) {
      if (instance.document.sessionId === baseSessionId) {
        continue;
      }
      referenceEntries.push({
        doc: instance.document,
        role: slot.role,
        roleId: slot.roleId,
      });
    }
  }

  if (
    (normalized === "outfit_from_reference" || normalized === "person_outfit") &&
    referenceEntries.length > 0
  ) {
    const clothingEntries = referenceEntries.filter(
      (entry) => entry.role === "outfit" || entry.roleId === "clothing_item" || entry.roleId === "outfit"
    );
    const primaryOutfit = clothingEntries[0] ?? referenceEntries[0]!;
    let next = applyWearOutfitComposition(
      baseDoc,
      primaryOutfit.doc.backgroundUrl,
      primaryOutfit.doc.name
    );
    for (const entry of clothingEntries.slice(1)) {
      const analyzed = analyzeCompositionReference({
        name: entry.doc.name,
        url: entry.doc.backgroundUrl,
        type: "style",
      });
      next = addCompositionReference(next, analyzed);
    }
    next = attachOutputSettings(next, normalized, output, motion, slots, fusionQuestionAnswers, fusionOutputSettings);
    return next;
  }

  let next = ensureFusionPlan(baseDoc, normalized);
  for (const entry of referenceEntries) {
    const step = fusionIntentDefinition(normalized).uploadSteps.find(
      (s) => s.id === entry.roleId || s.role === entry.role
    );
    const analyzed = analyzeCompositionReference({
      name: entry.doc.name,
      url: entry.doc.backgroundUrl,
      type: roleToReferenceType(step?.role ?? entry.role),
    });
    next = addCompositionReference(next, analyzed);
  }

  const fusion = getFusionPlan(next);
  if (fusion) {
    const categorySettings =
      Object.keys(fusionQuestionAnswers).length > 0
        ? buildFusionOutputSettings(normalized, fusionQuestionAnswers)
        : fusionOutputSettings;
    next = patchFusionPlan(next, {
      ...fusion,
      inheritedTraits: buildInheritedTraits(normalized),
      generationSettings: patchFusionGenerationSettings(fusion, categorySettings).generationSettings,
    });
  }

  next = attachOutputSettings(next, normalized, output, motion, slots, fusionQuestionAnswers, fusionOutputSettings);
  return next;
}

function patchNonFusionIntake(
  baseDoc: EditorCanvasDocument,
  config: EditorWorkflowReferenceConfig,
  output: EditorReferenceOutputSelection,
  motion: EditorReferenceMotionSelection
): EditorCanvasDocument {
  let next = baseDoc;
  if (config.workflow === "motion_prepare" && output.outputMode === "sequence") {
    next = {
      ...next,
      instructionStudioState: {
        ...next.instructionStudioState,
        fusionPlan: undefined,
        combineIntent: undefined,
        referenceIntake: {
          outputMode: output.outputMode,
          stepCount: output.stepCount,
          motionHandoff: motion.enabled,
          motionDurationSec: motion.durationSec,
        },
      },
    };
  }
  return next;
}

function buildRoleAssignmentsFromSlots(slots: EditorReferenceRoleSlot[]): EditorReferenceAssignment[] {
  const assignments: EditorReferenceAssignment[] = [];
  for (const slot of slots) {
    for (const instance of slot.instances) {
      const friendly = buildFriendlyFileDisplay({
        name: instance.originalFilename ?? instance.document.name,
        role: slot.role,
      });
      assignments.push({
        roleId: slot.roleId,
        role: slot.role,
        instanceId: instance.instanceId,
        url: instance.document.backgroundUrl,
        name: instance.document.name,
        friendlyName: friendly.title,
        metadata: {
          ...instance.metadata,
          role: instance.metadata.role ?? slot.role,
        },
      });
    }
  }
  return assignments;
}

function attachOutputSettings(
  document: EditorCanvasDocument,
  intent: EditorFusionIntent,
  output: EditorReferenceOutputSelection,
  motion: EditorReferenceMotionSelection,
  slots: EditorReferenceRoleSlot[],
  fusionQuestionAnswers: EditorReferenceIntakeState["fusionQuestionAnswers"] = {},
  fusionOutputSettings: EditorReferenceIntakeState["fusionOutputSettings"] = {}
): EditorCanvasDocument {
  const fusion = getFusionPlan(document);
  if (!fusion) {
    return document;
  }

  const outputMode =
    output.outputMode === "sequence"
      ? "sequence"
      : output.outputMode === "variations"
        ? "variations"
        : "single";

  const categorySettings =
    Object.keys(fusionQuestionAnswers).length > 0
      ? buildFusionOutputSettings(intent, fusionQuestionAnswers)
      : fusionOutputSettings;

  let next = patchFusionPlan(
    document,
    patchFusionGenerationSettings(fusion, {
      ...categorySettings,
      outputMode,
      stepCount: output.outputMode === "sequence" ? output.stepCount : 1,
      variationCount:
        output.outputMode === "variations"
          ? (output.customVariationCount ?? output.variationCount)
          : 1,
      motionHandoff: motion.enabled,
      motionDurationSec: motion.durationSec,
    })
  );

  const txType = fusionIntentToTransformationType(intent);
  if (output.outputMode === "sequence" && txType) {
    const baseUrl = next.backgroundUrl;
    const refUrls = slots.flatMap((slot) =>
      slot.instances.map((instance) => instance.document.backgroundUrl)
    );
    const session = createTransformationSession({
      type: txType,
      sourceImageUrl: baseUrl,
      targetReferenceUrls: refUrls.filter((url) => url !== baseUrl),
      stepCount: output.stepCount,
      targetDescription: intent,
    });
    next = {
      ...next,
      instructionStudioState: {
        ...next.instructionStudioState,
        transformationSession: {
          ...session,
          motionReady: motion.enabled,
        },
        referenceIntake: {
          roleAssignments: buildRoleAssignmentsFromSlots(slots),
          outputMode,
          stepCount: output.stepCount,
          variationCount: output.variationCount,
          motionHandoff: motion.enabled,
          motionDurationSec: motion.durationSec,
        },
      },
    };
  } else {
    next = {
      ...next,
      instructionStudioState: {
        ...next.instructionStudioState,
        referenceIntake: {
          roleAssignments: buildRoleAssignmentsFromSlots(slots),
          outputMode,
          stepCount: output.stepCount,
          variationCount: output.variationCount,
          motionHandoff: motion.enabled,
          motionDurationSec: motion.durationSec,
        },
      },
    };
  }

  return next;
}

export function referenceIntakeCostOptions(
  state: EditorReferenceIntakeState
): import("@/types/editor-generation-access").EstimateEditorGenerationCostOptions {
  const referenceCount = state.slots.reduce((sum, slot) => sum + slot.instances.length, 0);
  const outputMode: "single" | "sequence" | "variations" =
    state.output.outputMode === "sequence"
      ? "sequence"
      : state.output.outputMode === "variations"
        ? "variations"
        : "single";

  return {
    referenceCount,
    outputMode,
    stepCount: state.output.outputMode === "sequence" ? state.output.stepCount : undefined,
    variationCount:
      state.output.outputMode === "variations"
        ? (state.output.customVariationCount ?? state.output.variationCount)
        : undefined,
    motionDurationSec: state.motion.enabled ? state.motion.durationSec : 0,
  };
}

export function resolveReferenceIntakeConfig(input: {
  workflow: import("@/lib/editor-start-flow").EditorPostUploadMode;
  intent?: EditorFusionIntent;
}): EditorWorkflowReferenceConfig {
  return resolveWorkflowReferenceConfig(input);
}
