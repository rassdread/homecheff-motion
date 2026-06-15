import {
  buildCharacterExtractionDraft,
  EMPTY_CHARACTER_EXTRACTION_CUSTOMIZATION,
  type StudioCharacterExtractionCustomization,
  type StudioCharacterExtractionMode,
} from "@/lib/studio-character-entry-actions";
import {
  applyCharacterDynamicAiSuggestions,
  resolveCharacterDynamicQuestions,
} from "@/lib/character-dynamic-questions";
import { runCharacterEngine } from "@/lib/character-engine";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { CharacterDynamicAnswers, CharacterDynamicQuestion, CharacterReferenceMode } from "@/types/character-cluster";
import type { MotionCharacterPartDetection } from "@/types/motion-ready-character-wizard";
import type { CharacterEngineSummary, CharacterEngineSaveMetadata } from "@/types/character-engine";

export type CharacterFromReferenceWizardStep =
  | "upload"
  | "analyze"
  | "findings"
  | "mode"
  | "questions"
  | "generate"
  | "preview"
  | "save"
  | "complete";

export type CharacterFromReferenceWizardState = {
  step: CharacterFromReferenceWizardStep;
  sourceReferenceImageUrl: string;
  sourceReferenceStorageKey: string;
  sourceReferenceName: string;
  uploadSaved: boolean;
  visionAnalysis: AssetVisionAnalysis | null;
  visionStatus: "idle" | "loading" | "ready" | "failed";
  visionError: string;
  partDetections: MotionCharacterPartDetection[];
  availableParts: string[];
  missingParts: string[];
  referenceMode: CharacterReferenceMode;
  questions: CharacterDynamicQuestion[];
  answers: CharacterDynamicAnswers;
  customization: StudioCharacterExtractionCustomization;
  generatedImageUrl: string;
  generatedStorageKey: string;
  previewApproved: boolean;
  characterName: string;
  projectId: string | null;
  projectTitle: string | null;
  storyboardId: string | null;
  savedCharacterId: string | null;
  generationError: string;
  seedCharacterId: string | null;
  engineSummary: CharacterEngineSummary | null;
  engineSaveMetadata: CharacterEngineSaveMetadata | null;
};

export function createEmptyFromReferenceWizardState(input?: {
  projectId?: string | null;
  projectTitle?: string | null;
  storyboardId?: string | null;
  seedImageUrl?: string;
  seedStorageKey?: string;
  seedName?: string;
  seedCharacterId?: string | null;
  initialMode?: CharacterReferenceMode;
}): CharacterFromReferenceWizardState {
  return {
    step: input?.seedImageUrl ? "analyze" : "upload",
    sourceReferenceImageUrl: input?.seedImageUrl ?? "",
    sourceReferenceStorageKey: input?.seedStorageKey ?? "",
    sourceReferenceName: input?.seedName ?? "",
    uploadSaved: Boolean(input?.seedImageUrl),
    visionAnalysis: null,
    visionStatus: input?.seedImageUrl ? "loading" : "idle",
    visionError: "",
    partDetections: [],
    availableParts: [],
    missingParts: [],
    referenceMode: input?.initialMode ?? "exact",
    questions: [],
    answers: {},
    customization: { ...EMPTY_CHARACTER_EXTRACTION_CUSTOMIZATION },
    generatedImageUrl: "",
    generatedStorageKey: "",
    previewApproved: false,
    characterName: input?.seedName ?? "",
    projectId: input?.projectId ?? null,
    projectTitle: input?.projectTitle ?? null,
    storyboardId: input?.storyboardId ?? null,
    savedCharacterId: null,
    generationError: "",
    seedCharacterId: input?.seedCharacterId ?? null,
    engineSummary: null,
    engineSaveMetadata: null,
  };
}

export function seedFromReferenceAnalysis(
  state: CharacterFromReferenceWizardState,
  vision: AssetVisionAnalysis,
  locale: "nl" | "en" = "en"
): CharacterFromReferenceWizardState {
  const engine = runCharacterEngine({
    route: "from-reference",
    vision,
    referenceMode: state.referenceMode,
    locale,
  });
  return {
    ...state,
    visionAnalysis: vision,
    visionStatus: "ready",
    partDetections: engine.analysis.partDetections,
    availableParts: engine.analysis.visibleParts,
    missingParts: engine.analysis.missingParts,
    questions: engine.questions,
    answers: engine.answers,
    engineSummary: engine.summary,
    engineSaveMetadata: engine.saveMetadata,
    characterName: state.characterName || state.sourceReferenceName || vision.objectTypeLabel || "Character",
    step: "findings",
  };
}

export function applyReferenceModeToState(
  state: CharacterFromReferenceWizardState,
  mode: CharacterReferenceMode,
  locale: "nl" | "en" = "en"
): CharacterFromReferenceWizardState {
  if (!state.visionAnalysis) {
    return { ...state, referenceMode: mode };
  }
  const questions = resolveCharacterDynamicQuestions({
    route: "from-reference",
    vision: state.visionAnalysis,
    referenceMode: mode,
    locale,
  });
  const engine = runCharacterEngine({
    route: "from-reference",
    vision: state.visionAnalysis,
    referenceMode: mode,
    locale,
  });
  return {
    ...state,
    referenceMode: mode,
    questions,
    answers: applyCharacterDynamicAiSuggestions(questions),
    engineSummary: engine.summary,
    engineSaveMetadata: engine.saveMetadata,
    step: mode === "exact" ? "questions" : "questions",
  };
}

function answersToCustomization(answers: CharacterDynamicAnswers): StudioCharacterExtractionCustomization {
  return {
    clothing: String(answers.ref_custom_clothing ?? ""),
    props: String(answers.ref_custom_props ?? ""),
    colors: String(answers.ref_custom_colors ?? ""),
    style: String(answers.ref_custom_style ?? ""),
    age: "",
    gender: "",
    brandTraits: "",
  };
}

export function characterFromReferenceWizardToDraft(state: CharacterFromReferenceWizardState) {
  const customization = {
    ...state.customization,
    ...answersToCustomization(state.answers),
  };
  const mode: StudioCharacterExtractionMode =
    state.referenceMode === "new_character"
      ? "new_character"
      : state.referenceMode === "custom_variant"
        ? "custom_variant"
        : "exact";

  const draft = buildCharacterExtractionDraft({
    imageUrl: state.generatedImageUrl || state.sourceReferenceImageUrl,
    storageKey: state.generatedStorageKey || state.sourceReferenceStorageKey,
    fileName: state.sourceReferenceName,
    vision: state.visionAnalysis,
    mode,
    customization,
    suggestedName: state.characterName,
  });

  return {
    ...draft,
    referenceImageUrl: state.generatedImageUrl || draft.referenceImageUrl,
    referenceStorageKey: state.generatedStorageKey || draft.referenceStorageKey,
    name: state.characterName,
    fields: {
      ...draft.fields,
      sourceRoute: "from-reference",
      seedCharacterId: state.seedCharacterId ?? "",
    },
  };
}

export function extractionModeToReferenceMode(mode: StudioCharacterExtractionMode): CharacterReferenceMode {
  return mode;
}

export function referenceModeToExtractionMode(mode: CharacterReferenceMode): StudioCharacterExtractionMode {
  return mode;
}
