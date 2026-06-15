import {
  analyzeAnimationReadiness,
  buildCharacterConstructionProfile,
  detectBodyVisibilityFromVision,
} from "@/lib/studio-asset-animation-readiness";
import {
  analyzeCharacter,
  buildCharacterEngineSaveMetadata,
  buildCharacterSummary,
  evaluateMotionReadiness,
} from "@/lib/character-engine";
import { emptyPrepareForAnimationWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  MotionCharacterPartDetection,
  MotionCharacterPartId,
  MotionReadyBodyStyleChoice,
  MotionReadyPoseChoice,
  MotionReadySaveMetadata,
  MotionReadyStyleKind,
  MotionReadyWizardAnswers,
  MotionReadyWizardQuestion,
  MotionReadyWizardState,
  MotionReadyWizardStep,
} from "@/types/motion-ready-character-wizard";

function visionHaystack(vision: AssetVisionAnalysis): string {
  return [
    vision.objectTypeLabel,
    vision.visualStyle,
    vision.environmentHints,
    vision.materialHints,
    vision.identityFingerprint.silhouette,
    vision.identityFingerprint.faceStructure,
    vision.identityFingerprint.proportions,
    ...vision.keyFeatures,
    ...vision.suggestedPreserve,
    ...vision.shapeLanguage,
  ]
    .join(" ")
    .toLowerCase();
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function resolveMotionStyleKind(vision: AssetVisionAnalysis): MotionReadyStyleKind {
  const text = visionHaystack(vision);
  if (vision.objectType === "mascot" || /mascot|globe man|brand character/.test(text)) {
    return "mascot";
  }
  if (/sketch|rough|pencil|line art/.test(text)) {
    return "sketch";
  }
  if (/cartoon|vector|flat|illustration|animated style/.test(text)) {
    return /illustration|logo character/.test(text) ? "illustration" : "cartoon";
  }
  if (/photo|realistic|portrait|selfie/.test(text)) {
    return "realistic_photo";
  }
  return "illustration";
}

export function detectMotionCharacterParts(vision: AssetVisionAnalysis): MotionCharacterPartDetection[] {
  const text = visionHaystack(vision);
  const bodyVisibility = detectBodyVisibilityFromVision(vision);
  const fullBody = bodyVisibility === "full_body";
  const upperBody = fullBody || bodyVisibility === "half_body" || bodyVisibility === "portrait";

  const headPresent = hasPattern(text, [/head/, /face/, /portrait/, /mascot/]) || vision.objectType !== "logo";
  const facePresent = hasPattern(text, [/face/, /eyes/, /smile/, /portrait/]) || headPresent;
  const torsoPresent = upperBody || hasPattern(text, [/torso/, /chest/, /shirt/, /jacket/, /body/]);
  const armsPresent = fullBody || hasPattern(text, [/arm/, /sleeve/, /gesture/]);
  const handsPresent = fullBody || hasPattern(text, [/hand/, /glove/, /fingers/]);
  const legsPresent = fullBody || hasPattern(text, [/leg/, /pants/, /trousers/, /stance/]);
  const feetPresent = fullBody || hasPattern(text, [/feet/, /foot/, /shoe/, /boot/]);
  const clothingPresent = hasPattern(text, [/shirt/, /jacket/, /apron/, /dress/, /outfit/, /uniform/, /clothing/]);
  const posePresent = hasPattern(text, [/standing/, /neutral/, /pose/, /front view/]) || fullBody;
  const backgroundPresent = hasPattern(text, [/background/, /scene/, /kitchen/, /room/, /outdoor/, /indoor/])
    && !/transparent/.test(text);
  const stylePresent = Boolean(vision.visualStyle?.trim());

  const part = (
    id: MotionCharacterPartId,
    labelKey: string,
    present: boolean,
    partial = false,
    detail?: string
  ): MotionCharacterPartDetection => ({
    id,
    labelKey,
    status: present ? "present" : partial ? "partial" : "missing",
    detail,
  });

  return [
    part("head", "motionReady.wizard.part.head", headPresent),
    part("face", "motionReady.wizard.part.face", facePresent),
    part("torso", "motionReady.wizard.part.torso", torsoPresent, upperBody && !fullBody),
    part("arms", "motionReady.wizard.part.arms", armsPresent),
    part("hands", "motionReady.wizard.part.hands", handsPresent),
    part("legs", "motionReady.wizard.part.legs", legsPresent),
    part("feet", "motionReady.wizard.part.feet", feetPresent),
    part(
      "clothing",
      "motionReady.wizard.part.clothing",
      clothingPresent,
      false,
      clothingPresent ? extractClothingHint(text) : undefined
    ),
    part("pose", "motionReady.wizard.part.pose", posePresent, !posePresent && upperBody),
    part("background", "motionReady.wizard.part.background", !backgroundPresent, backgroundPresent),
    part(
      "style",
      "motionReady.wizard.part.style",
      stylePresent,
      false,
      vision.visualStyle || undefined
    ),
  ];
}

function extractClothingHint(text: string): string | undefined {
  const match = text.match(/\b(green|blue|red|black|white)\s+(shirt|jacket|apron|dress|uniform)\b/);
  return match ? `${match[1]} ${match[2]}` : undefined;
}

export function summarizeMotionReadiness(input: {
  vision: AssetVisionAnalysis;
  parts: MotionCharacterPartDetection[];
}): {
  readinessScore: number;
  availableParts: MotionCharacterPartId[];
  missingParts: MotionCharacterPartId[];
  bodyVisibility: ReturnType<typeof detectBodyVisibilityFromVision>;
} {
  const construction = buildCharacterConstructionProfile({
    ...emptyPrepareForAnimationWizardDraft("character"),
    sourceVisionAnalysis: input.vision,
    identityAssetType:
      input.vision.objectType === "mascot"
        ? "mascot"
        : input.vision.objectType === "human"
          ? "person"
          : "character",
  });
  const analysis = analyzeAnimationReadiness({ vision: input.vision, construction });
  const availableParts = input.parts
    .filter((p) => p.status === "present")
    .map((p) => p.id);
  const missingParts = input.parts
    .filter((p) => p.status === "missing" || p.status === "partial")
    .filter((p) => p.id !== "background" && p.id !== "style")
    .map((p) => p.id);

  return {
    readinessScore: analysis.score,
    availableParts,
    missingParts,
    bodyVisibility: analysis.bodyVisibility,
  };
}

export function isPortraitOnlyFlow(bodyVisibility: ReturnType<typeof detectBodyVisibilityFromVision>): boolean {
  return bodyVisibility === "portrait" || bodyVisibility === "head_only" || bodyVisibility === "half_body";
}

export function isFullBodyFlow(bodyVisibility: ReturnType<typeof detectBodyVisibilityFromVision>): boolean {
  return bodyVisibility === "full_body";
}

export function isMascotFlow(vision: AssetVisionAnalysis): boolean {
  return vision.objectType === "mascot" || resolveMotionStyleKind(vision) === "mascot";
}

export function resolveMotionWizardQuestions(input: {
  vision: AssetVisionAnalysis;
  bodyVisibility: ReturnType<typeof detectBodyVisibilityFromVision>;
  parts: MotionCharacterPartDetection[];
}): MotionReadyWizardQuestion[] {
  const clothingHint = input.parts.find((p) => p.id === "clothing")?.detail ?? "casual outfit";
  const questions: MotionReadyWizardQuestion[] = [];

  if (isPortraitOnlyFlow(input.bodyVisibility)) {
    questions.push({
      id: "body_style",
      labelKey: "motionReady.wizard.question.bodyStyle",
      type: "choice",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.bodyStyle",
      aiSuggestionValue: isMascotFlow(input.vision) ? "mascot_cartoon" : "realistic",
      options: [
        { id: "realistic", labelKey: "motionReady.wizard.option.realisticBody" },
        { id: "mascot_cartoon", labelKey: "motionReady.wizard.option.mascotBody" },
      ],
    });
    questions.push({
      id: "clothing",
      labelKey: "motionReady.wizard.question.clothing",
      type: "text",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.clothing",
      aiSuggestionValue: clothingHint,
    });
    questions.push({
      id: "pose",
      labelKey: "motionReady.wizard.question.pose",
      type: "choice",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.pose",
      aiSuggestionValue: "neutral_standing",
      options: [
        { id: "neutral_standing", labelKey: "motionReady.wizard.option.poseNeutral" },
        { id: "arms_at_sides", labelKey: "motionReady.wizard.option.poseArms" },
        { id: "friendly", labelKey: "motionReady.wizard.option.poseFriendly" },
        { id: "powerful", labelKey: "motionReady.wizard.option.posePowerful" },
      ],
    });
    return questions;
  }

  if (isFullBodyFlow(input.bodyVisibility)) {
    questions.push({
      id: "keep_clothing",
      labelKey: "motionReady.wizard.question.keepClothing",
      type: "boolean",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.keepClothing",
      aiSuggestionValue: "true",
    });
    questions.push({
      id: "remove_background",
      labelKey: "motionReady.wizard.question.removeBackground",
      type: "boolean",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.removeBackground",
      aiSuggestionValue: "true",
    });
    return questions;
  }

  if (isMascotFlow(input.vision)) {
    questions.push({
      id: "preserve_mascot_style",
      labelKey: "motionReady.wizard.question.preserveMascot",
      type: "boolean",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.preserveMascot",
      aiSuggestionValue: "true",
    });
    questions.push({
      id: "clarify_hands_feet",
      labelKey: "motionReady.wizard.question.clarifyHandsFeet",
      type: "boolean",
      aiSuggestionKey: "motionReady.wizard.aiSuggestion.clarifyHandsFeet",
      aiSuggestionValue: "true",
    });
  }

  return questions;
}

export function applyAiSuggestionsToAnswers(
  questions: MotionReadyWizardQuestion[]
): MotionReadyWizardAnswers {
  const answers: MotionReadyWizardAnswers = {};
  for (const question of questions) {
    if (!question.aiSuggestionValue) {
      continue;
    }
    switch (question.id) {
      case "body_style":
        answers.bodyStyle = question.aiSuggestionValue as MotionReadyBodyStyleChoice;
        break;
      case "clothing":
        answers.clothing = question.aiSuggestionValue;
        break;
      case "pose":
        answers.pose = question.aiSuggestionValue as MotionReadyPoseChoice;
        break;
      case "keep_clothing":
        answers.keepExistingClothing = question.aiSuggestionValue === "true";
        break;
      case "remove_background":
        answers.removeBackground = question.aiSuggestionValue === "true";
        break;
      case "preserve_mascot_style":
        answers.preserveMascotStyle = question.aiSuggestionValue === "true";
        break;
      case "clarify_hands_feet":
        answers.clarifyHandsFeet = question.aiSuggestionValue === "true";
        break;
      default:
        break;
    }
  }
  return answers;
}

const POSE_PROMPTS: Record<MotionReadyPoseChoice, string> = {
  neutral_standing: "neutral standing pose, facing camera",
  arms_at_sides: "standing with arms relaxed at sides",
  friendly: "friendly welcoming pose with slight smile",
  powerful: "confident powerful stance",
};

export function buildFullBodyGenerationPrompt(input: {
  vision: AssetVisionAnalysis;
  answers: MotionReadyWizardAnswers;
  missingParts: MotionCharacterPartId[];
  brandRules?: string;
}): string {
  const style = resolveMotionStyleKind(input.vision);
  const preserve = [
    "Preserve face identity and recognizable features from the reference.",
    input.answers.preserveMascotStyle || style === "mascot"
      ? "Preserve mascot style, proportions and brand colors exactly."
      : "",
    input.answers.keepExistingClothing ? "Keep existing clothing style from reference." : "",
    input.brandRules?.trim() ? `Brand rules: ${input.brandRules.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bodyStyle =
    input.answers.bodyStyle === "mascot_cartoon"
      ? "cartoon mascot body"
      : style === "realistic_photo"
        ? "realistic human body"
        : "illustrated character body";

  const clothing = input.answers.clothing?.trim() || "appropriate complete outfit";
  const pose = input.answers.pose ? POSE_PROMPTS[input.answers.pose] : POSE_PROMPTS.neutral_standing;
  const missing = input.missingParts.filter((p) => !["background", "style", "pose"].includes(p));

  return [
    "Create a full-body Motion-ready character image from the reference.",
    `Complete missing parts: ${missing.join(", ") || "full body"}.`,
    `Body style: ${bodyStyle}.`,
    `Clothing: ${clothing}.`,
    `Pose: ${pose}.`,
    "Show clear hands and feet. Use transparent background.",
    "Neutral animation-friendly stance. Do not crop head or feet.",
    preserve,
    "Do not change identity unnecessarily.",
  ].join(" ");
}

export function buildMotionReadyProtectionPrompt(): string {
  return "Do not alter face identity, mascot colors, or brand style. Only complete missing body parts.";
}

export function validateMotionReadyCharacter(input: {
  generatedFullBodyUrl: string;
  parts: MotionCharacterPartDetection[];
  readinessScore: number;
  transparentPngUrl?: string;
}): { motionReady: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.generatedFullBodyUrl.trim()) {
    reasons.push("missing_generated_image");
    return { motionReady: false, reasons };
  }
  if (input.readinessScore < 35 && !input.generatedFullBodyUrl) {
    reasons.push("low_readiness_score");
  }
  return { motionReady: reasons.length === 0, reasons };
}

export function buildMotionReadySaveMetadata(state: MotionReadyWizardState): MotionReadySaveMetadata {
  const style = state.visionAnalysis ? resolveMotionStyleKind(state.visionAnalysis) : "illustration";
  const generatedMissing = state.missingParts.filter((p) =>
    ["torso", "arms", "hands", "legs", "feet", "pose"].includes(p)
  );
  const validation = validateMotionReadyCharacter({
    generatedFullBodyUrl: state.generatedFullBodyUrl,
    parts: state.partDetections.map((part) =>
      ["hands", "feet", "arms", "legs", "torso"].includes(part.id)
        ? { ...part, status: state.generatedFullBodyUrl ? "present" : part.status }
        : part
    ),
    readinessScore: state.readinessScore,
    transparentPngUrl: state.transparentPngUrl,
  });

  return {
    sourceReferenceUrl: state.sourceReferenceImageUrl,
    generatedFullBodyUrl: state.generatedFullBodyUrl,
    transparentPngUrl: state.transparentPngUrl || state.generatedFullBodyUrl,
    motionReady: validation.motionReady,
    bodyCompletenessScore: state.readinessScore,
    detectedParts: state.partDetections,
    generatedMissingParts: generatedMissing,
    style,
    clothing: state.answers.clothing ?? "",
    pose: state.answers.pose ?? "neutral_standing",
    projectId: state.projectId,
    createdAt: new Date().toISOString(),
  };
}

export function motionReadyWizardToAssetDraft(state: MotionReadyWizardState): AssetWizardDraft {
  const draft = emptyPrepareForAnimationWizardDraft("character");
  const metadata = buildMotionReadySaveMetadata(state);
  const generationPrompt = state.visionAnalysis
    ? buildFullBodyGenerationPrompt({
        vision: state.visionAnalysis,
        answers: state.answers,
        missingParts: state.missingParts,
      })
    : "";

  return {
    ...draft,
    name: state.characterName || state.sourceReferenceName || "Motion character",
    sourceReferenceImageUrl: state.sourceReferenceImageUrl,
    sourceReferenceStorageKey: state.sourceReferenceStorageKey,
    sourceReferenceName: state.sourceReferenceName,
    sourceVisionAnalysis: state.visionAnalysis,
    sourceVisionAnalysisStatus: state.visionStatus === "ready" ? "ready" : "idle",
    identityAssetType:
      state.visionAnalysis?.objectType === "mascot"
        ? "mascot"
        : state.visionAnalysis?.objectType === "human"
          ? "person"
          : "character",
    identityProfileConfirmed: true,
    characterConstructionConfirmed: true,
    animationReadinessConfirmed: true,
    animationPreparationActions: ["reconstruct_full_body", "remove_background", "transparent_png", "standard_pose"],
    referenceImageUrl: state.generatedFullBodyUrl || state.sourceReferenceImageUrl,
    referenceStorageKey: state.generatedFullBodyStorageKey || state.sourceReferenceStorageKey,
    generatedReferencePreviewUrl: state.generatedFullBodyUrl,
    generatedReferenceStorageKey: state.generatedFullBodyStorageKey,
    referenceMode: state.generatedFullBodyUrl ? "generate" : "upload",
    referenceGenerationPrompt: generationPrompt,
    summaryPrompt: generationPrompt,
    sourceTransformChange: generationPrompt,
    sourceTransformPreserve: buildMotionReadyProtectionPrompt(),
    fields: {
      motionReady: metadata.motionReady ? "true" : "false",
      bodyCompletenessScore: String(metadata.bodyCompletenessScore),
      transparentPngUrl: metadata.transparentPngUrl,
      generatedMissingParts: metadata.generatedMissingParts.join(","),
    },
  };
}

export function shouldOpenEditorByDefault(state: MotionReadyWizardState): boolean {
  return state.openEditorRequested;
}

export function nextMotionWizardStep(step: MotionReadyWizardStep): MotionReadyWizardStep | null {
  const order: MotionReadyWizardStep[] = [
    "upload",
    "analysis",
    "readiness_summary",
    "dynamic_questions",
    "generate",
    "preview",
    "save",
    "complete",
  ];
  const index = order.indexOf(step);
  return index >= 0 && index < order.length - 1 ? order[index + 1]! : null;
}

export function canAdvanceMotionWizardStep(state: MotionReadyWizardState): boolean {
  switch (state.step) {
    case "upload":
      return Boolean(state.sourceReferenceImageUrl && state.uploadSaved);
    case "analysis":
      return state.visionStatus === "ready" && Boolean(state.visionAnalysis);
    case "readiness_summary":
      return state.readinessScore >= 0;
    case "dynamic_questions":
      return state.questions.every((q) => questionAnswered(q, state.answers));
    case "generate":
      return state.generationStatus === "ready" && Boolean(state.generatedFullBodyUrl);
    case "preview":
      return state.previewApproved;
    case "save":
      return Boolean(state.savedCharacterId);
    case "complete":
      return true;
    default:
      return false;
  }
}

function questionAnswered(question: MotionReadyWizardQuestion, answers: MotionReadyWizardAnswers): boolean {
  switch (question.id) {
    case "body_style":
      return Boolean(answers.bodyStyle);
    case "clothing":
      return Boolean(answers.clothing?.trim());
    case "pose":
      return Boolean(answers.pose);
    case "keep_clothing":
      return answers.keepExistingClothing !== undefined;
    case "remove_background":
      return answers.removeBackground !== undefined;
    case "preserve_mascot_style":
      return answers.preserveMascotStyle !== undefined;
    case "clarify_hands_feet":
      return answers.clarifyHandsFeet !== undefined;
    default:
      return true;
  }
}

export function motionReadyWizardSeedFromSource(input: {
  sourceImage: string;
  sourceStorageKey?: string;
  sourceName?: string;
  projectId?: string | null;
  projectTitle?: string | null;
}): MotionReadyWizardState {
  const base = createEmptyMotionReadyWizardState({
    id: input.projectId,
    title: input.projectTitle,
  });
  const name = input.sourceName?.trim() || "Reference";
  return {
    ...base,
    sourceReferenceImageUrl: input.sourceImage.trim(),
    sourceReferenceStorageKey: input.sourceStorageKey ?? "",
    sourceReferenceName: name,
    uploadSaved: true,
    characterName: name,
    step: "analysis",
    visionStatus: "loading",
  };
}

export function createEmptyMotionReadyWizardState(project?: {
  id?: string | null;
  title?: string | null;
}): MotionReadyWizardState {
  return {
    step: "upload",
    sourceReferenceImageUrl: "",
    sourceReferenceStorageKey: "",
    sourceReferenceName: "",
    uploadSaved: false,
    visionAnalysis: null,
    visionStatus: "idle",
    visionError: "",
    partDetections: [],
    bodyVisibility: "partial",
    readinessScore: 0,
    availableParts: [],
    missingParts: [],
    questions: [],
    answers: {},
    generationStatus: "idle",
    generationError: "",
    generatedFullBodyUrl: "",
    generatedFullBodyStorageKey: "",
    transparentPngUrl: "",
    previewApproved: false,
    characterName: "",
    projectId: project?.id ?? null,
    projectTitle: project?.title ?? null,
    savedCharacterId: null,
    openEditorRequested: false,
    engineSummary: null,
    engineSaveMetadata: null,
  };
}

export function seedAnalysisFromVision(
  state: MotionReadyWizardState,
  vision: AssetVisionAnalysis
): MotionReadyWizardState {
  const analysis = analyzeCharacter({ vision });
  const motionReadiness = evaluateMotionReadiness({ analysis, vision, strict: true });
  const engineSummary = buildCharacterSummary({
    analysis,
    vision,
    motionReadiness,
    strictMotion: true,
  });
  const engineSaveMetadata = buildCharacterEngineSaveMetadata({
    analysis,
    route: "motion-ready",
    vision,
    strictMotion: true,
  });
  const questions = resolveMotionWizardQuestions({
    vision,
    bodyVisibility: analysis.bodyVisibility,
    parts: analysis.partDetections,
  });
  return {
    ...state,
    visionAnalysis: vision,
    visionStatus: "ready",
    partDetections: analysis.partDetections,
    bodyVisibility: analysis.bodyVisibility,
    readinessScore: analysis.readinessScore,
    availableParts: analysis.visibleParts,
    missingParts: analysis.missingParts,
    questions,
    answers: applyAiSuggestionsToAnswers(questions),
    engineSummary,
    engineSaveMetadata,
    characterName: state.characterName || state.sourceReferenceName || "Motion character",
  };
}

export function handsAndFeetRequiredForMotionReady(parts: MotionCharacterPartDetection[]): boolean {
  const hands = parts.find((p) => p.id === "hands");
  const feet = parts.find((p) => p.id === "feet");
  return hands?.status !== "present" || feet?.status !== "present";
}

export function portraitUploadDetectsMissingBody(vision: AssetVisionAnalysis): boolean {
  const visibility = detectBodyVisibilityFromVision(vision);
  return isPortraitOnlyFlow(visibility);
}
