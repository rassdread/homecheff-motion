import { fusionWorkflowRenderCredits } from "@/lib/editor-fusion-workflow-credits";
import { buildFusionWizardCreditPreview } from "@/lib/editor-fusion-wizard-credits";
import { createQueuedReferenceAnalysis } from "@/lib/editor-reference-role-analysis";
import { createReferenceIntakeState } from "@/lib/editor-reference-role-intake";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";
import type { EditorMorphActionId } from "@/lib/editor-morph-actions";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type {
  MascotTransformAdvancedOptions,
  MascotTransformPreserveOption,
  MascotTransformSourceType,
  MascotTransformTargetType,
  TransformationBlueprint,
} from "@/types/editor-mascot-transformation";

export const MASCOT_TRANSFORM_WORKFLOW = "mascot_transform" as const;

export const MASCOT_TRANSFORM_TARGET_I18N: Record<MascotTransformTargetType, string> = {
  human_version: "editor.mascotTransform.target.humanVersion",
  new_mascot: "editor.mascotTransform.target.newMascot",
  chef_mascot: "editor.mascotTransform.target.chefMascot",
  garden_mascot: "editor.mascotTransform.target.gardenMascot",
  designer_mascot: "editor.mascotTransform.target.designerMascot",
  character_3d: "editor.mascotTransform.target.character3d",
  cinematic: "editor.mascotTransform.target.cinematic",
  cartoon_sticker: "editor.mascotTransform.target.cartoonSticker",
  business_avatar: "editor.mascotTransform.target.businessAvatar",
  custom: "editor.mascotTransform.target.custom",
};

export const MASCOT_TRANSFORM_PRESERVE_I18N: Record<MascotTransformPreserveOption, string> = {
  colors: "editor.mascotTransform.preserve.colors",
  face_shape: "editor.mascotTransform.preserve.faceShape",
  eyes: "editor.mascotTransform.preserve.eyes",
  clothing: "editor.mascotTransform.preserve.clothing",
  accessories: "editor.mascotTransform.preserve.accessories",
  logo: "editor.mascotTransform.preserve.logo",
  pose: "editor.mascotTransform.preserve.pose",
  style: "editor.mascotTransform.preserve.style",
};

const HUMAN_TO_MASCOT_TARGETS = new Set<MascotTransformTargetType>([
  "new_mascot",
  "chef_mascot",
  "garden_mascot",
  "designer_mascot",
]);

const UPGRADE_TARGETS = new Set<MascotTransformTargetType>([
  "new_mascot",
  "chef_mascot",
  "garden_mascot",
  "designer_mascot",
  "character_3d",
  "cinematic",
  "cartoon_sticker",
  "business_avatar",
  "custom",
]);

export function resolveMascotTransformFusionIntent(
  target: MascotTransformTargetType,
  source: MascotTransformSourceType = "mascot"
): EditorFusionIntent {
  if (target === "human_version") {
    return "mascot_into_human";
  }
  if (source === "human" && HUMAN_TO_MASCOT_TARGETS.has(target)) {
    return "human_into_mascot";
  }
  if (UPGRADE_TARGETS.has(target)) {
    return "character_upgrade";
  }
  return "character_upgrade";
}

export function mascotTransformTargetStyle(target: MascotTransformTargetType): string | undefined {
  switch (target) {
    case "chef_mascot":
      return "chef";
    case "garden_mascot":
      return "gardener";
    case "designer_mascot":
      return "designer";
    case "character_3d":
      return "3d";
    case "cinematic":
      return "cinematic";
    case "cartoon_sticker":
      return "cartoon";
    case "business_avatar":
      return "business";
    default:
      return undefined;
  }
}

export function morphActionToMascotTarget(id: EditorMorphActionId): MascotTransformTargetType {
  switch (id) {
    case "human_to_cartoon":
      return "cartoon_sticker";
    case "human_to_mascot":
    case "pet_to_mascot":
      return "new_mascot";
    case "human_to_cinematic_character":
      return "cinematic";
    case "portrait_to_avatar":
      return "business_avatar";
    case "mascot_style_morph":
    case "mascot_variant_morph":
      return "new_mascot";
    default:
      return "custom";
  }
}

export function morphActionToSourceType(id: EditorMorphActionId): MascotTransformSourceType {
  if (id.startsWith("human_") || id === "portrait_to_avatar") {
    return "human";
  }
  if (id.startsWith("pet_") || id.startsWith("animal_")) {
    return "unknown";
  }
  if (id.startsWith("mascot_")) {
    return "mascot";
  }
  return "unknown";
}

export function buildTransformationBlueprint(input: {
  targetType: MascotTransformTargetType;
  preserve: MascotTransformPreserveOption[];
  userIntent: string;
  sourceType?: MascotTransformSourceType;
  advanced?: MascotTransformAdvancedOptions;
}): TransformationBlueprint {
  const sourceType = input.sourceType ?? "mascot";
  const fusionIntent = resolveMascotTransformFusionIntent(input.targetType, sourceType);
  const style = mascotTransformTargetStyle(input.targetType);
  const preserveLabels = input.preserve.join(", ");
  const change: string[] = [];
  if (input.targetType === "human_version") {
    change.push("bodyType", "material", "realism");
  } else if (style) {
    change.push("role", "costume", "styling");
  } else {
    change.push("characterType", "visualStyle");
  }

  const renderInstructions = [
    `Transform ${sourceType} character to ${input.targetType.replace(/_/g, " ")}.`,
    style ? `Target style: ${style}.` : "",
    preserveLabels ? `Preserve: ${preserveLabels}.` : "",
    input.userIntent.trim() ? `User wish: ${input.userIntent.trim()}.` : "",
    input.advanced?.customPrompt?.trim() ? `Custom: ${input.advanced.customPrompt.trim()}.` : "",
  ].filter(Boolean);

  return {
    sourceType,
    targetType: input.targetType,
    preserve: input.preserve,
    change,
    style,
    userIntent: input.userIntent.trim(),
    renderInstructions,
    fusionIntent,
  };
}

export function buildMascotTransformIntake(input: {
  targetType: MascotTransformTargetType;
  document: EditorCanvasDocument;
  sourceType?: MascotTransformSourceType;
  originalFilename?: string;
}): EditorReferenceIntakeState {
  const sourceType = input.sourceType ?? "mascot";
  const fusionIntent = resolveMascotTransformFusionIntent(input.targetType, sourceType);
  const config = workflowReferenceConfigForIntent(fusionIntent);
  const intake = createReferenceIntakeState({ config });
  const primaryRoleId = config.requiredRoles[0] ?? config.roles[0]?.id;
  if (!primaryRoleId) {
    return intake;
  }

  const instanceId = `mascot_${Date.now()}`;
  return {
    ...intake,
    slots: intake.slots.map((slot) => {
      if (slot.roleId !== primaryRoleId) {
        return slot;
      }
      return {
        ...slot,
        instances: [
          {
            instanceId,
            document: input.document,
            analysis: createQueuedReferenceAnalysis(),
            metadata: { role: slot.role },
            originalFilename: input.originalFilename,
          },
        ],
      };
    }),
  };
}

export function mascotTransformCreditPreview(input: {
  intake: EditorReferenceIntakeState;
  targetType: MascotTransformTargetType;
  sourceType?: MascotTransformSourceType;
  isAdmin?: boolean;
}) {
  const fusionIntent = resolveMascotTransformFusionIntent(
    input.targetType,
    input.sourceType ?? "mascot"
  );
  const preview = buildFusionWizardCreditPreview({
    intake: input.intake,
    isAdmin: input.isAdmin,
  });
  if (!preview) {
    const renderCredits = input.isAdmin ? 0 : fusionWorkflowRenderCredits(fusionIntent);
    return {
      analysisCredits: 0,
      renderCredits,
      totalCredits: renderCredits,
      adminFree: Boolean(input.isAdmin),
      photos: [],
    };
  }
  return preview;
}

export function mascotTransformUsesWizardFirst(): boolean {
  return true;
}
