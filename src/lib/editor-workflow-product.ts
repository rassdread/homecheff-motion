import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import type { EditorCombineIntent } from "@/types/editor-instruction-studio";

export type EditorWorkflowProduct = {
  mode: EditorPostUploadMode;
  icon: string;
  titleKey: string;
  leadKey: string;
  examplesKey: string;
  inputKey: string;
  outputKey: string;
  minImages: number;
};

export const EDITOR_WORKFLOW_PRODUCTS: EditorWorkflowProduct[] = [
  {
    mode: "edit",
    icon: "✏️",
    titleKey: "editor.v3.workflow.edit.title",
    leadKey: "editor.v3.workflow.edit.lead",
    examplesKey: "editor.v3.workflow.edit.examples",
    inputKey: "editor.v3.workflow.edit.input",
    outputKey: "editor.v3.workflow.edit.output",
    minImages: 1,
  },
  {
    mode: "combine",
    icon: "🧩",
    titleKey: "editor.v3.workflow.combine.title",
    leadKey: "editor.v3.workflow.combine.lead",
    examplesKey: "editor.v3.workflow.combine.examples",
    inputKey: "editor.v3.workflow.combine.input",
    outputKey: "editor.v3.workflow.combine.output",
    minImages: 2,
  },
  {
    mode: "motion_prepare",
    icon: "🎬",
    titleKey: "editor.v3.workflow.motion.title",
    leadKey: "editor.v3.workflow.motion.lead",
    examplesKey: "editor.v3.workflow.motion.examples",
    inputKey: "editor.v3.workflow.motion.input",
    outputKey: "editor.v3.workflow.motion.output",
    minImages: 1,
  },
  {
    mode: "export",
    icon: "📤",
    titleKey: "editor.v3.workflow.export.title",
    leadKey: "editor.v3.workflow.export.lead",
    examplesKey: "editor.v3.workflow.export.examples",
    inputKey: "editor.v3.workflow.export.input",
    outputKey: "editor.v3.workflow.export.output",
    minImages: 1,
  },
];

export type EditorCombineIntentOption = {
  id: EditorCombineIntent;
  labelKey: string;
  hintKey: string;
  requiresDualUpload: boolean;
};

export const EDITOR_COMBINE_INTENT_OPTIONS: EditorCombineIntentOption[] = [
  {
    id: "person_outfit",
    labelKey: "editor.v3.combine.intent.personOutfit",
    hintKey: "editor.v3.combine.intent.personOutfitHint",
    requiresDualUpload: true,
  },
  {
    id: "product_branding",
    labelKey: "editor.v3.combine.intent.productBranding",
    hintKey: "editor.v3.combine.intent.productBrandingHint",
    requiresDualUpload: false,
  },
  {
    id: "person_background",
    labelKey: "editor.v3.combine.intent.personBackground",
    hintKey: "editor.v3.combine.intent.personBackgroundHint",
    requiresDualUpload: false,
  },
  {
    id: "product_environment",
    labelKey: "editor.v3.combine.intent.productEnvironment",
    hintKey: "editor.v3.combine.intent.productEnvironmentHint",
    requiresDualUpload: false,
  },
  {
    id: "multiple_references",
    labelKey: "editor.v3.combine.intent.multipleReferences",
    hintKey: "editor.v3.combine.intent.multipleReferencesHint",
    requiresDualUpload: false,
  },
  {
    id: "custom_composition",
    labelKey: "editor.v3.combine.intent.customComposition",
    hintKey: "editor.v3.combine.intent.customCompositionHint",
    requiresDualUpload: false,
  },
];

export function workflowProductForMode(mode: EditorPostUploadMode): EditorWorkflowProduct {
  return EDITOR_WORKFLOW_PRODUCTS.find((p) => p.mode === mode) ?? EDITOR_WORKFLOW_PRODUCTS[0]!;
}

export function combineIntentOption(id: EditorCombineIntent): EditorCombineIntentOption {
  return EDITOR_COMBINE_INTENT_OPTIONS.find((o) => o.id === id) ?? EDITOR_COMBINE_INTENT_OPTIONS[0]!;
}

export function workflowChooserModes(): EditorPostUploadMode[] {
  return EDITOR_WORKFLOW_PRODUCTS.map((p) => p.mode);
}
