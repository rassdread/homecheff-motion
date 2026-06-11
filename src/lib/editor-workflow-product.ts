import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import {
  EDITOR_FUSION_CATEGORY_ORDER,
  fusionCategoryLabelKey,
  fusionIntentDefinition,
  fusionIntentsForCategory,
  requiresMultiUpload,
  type EditorFusionIntentDefinition,
} from "@/lib/editor-image-fusion-catalog";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

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
    titleKey: "editor.fusion.workflow.title",
    leadKey: "editor.fusion.workflow.lead",
    examplesKey: "editor.fusion.workflow.examples",
    inputKey: "editor.fusion.workflow.input",
    outputKey: "editor.fusion.workflow.output",
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

export type { EditorFusionIntentDefinition };

export function combineIntentOption(id: EditorFusionIntent): EditorFusionIntentDefinition {
  return fusionIntentDefinition(id);
}

export function fusionCategoryOrder() {
  return EDITOR_FUSION_CATEGORY_ORDER;
}

export function fusionCategoryTitleKey(category: (typeof EDITOR_FUSION_CATEGORY_ORDER)[number]) {
  return fusionCategoryLabelKey(category);
}

export function fusionIntentsInCategory(category: (typeof EDITOR_FUSION_CATEGORY_ORDER)[number]) {
  return fusionIntentsForCategory(category);
}

export function combineRequiresMultiUpload(intent: EditorFusionIntent): boolean {
  return requiresMultiUpload(intent);
}

/** @deprecated Use fusionIntentsInCategory */
export const EDITOR_COMBINE_INTENT_OPTIONS = EDITOR_FUSION_CATEGORY_ORDER.flatMap((c) =>
  fusionIntentsForCategory(c)
);

export function workflowProductForMode(mode: EditorPostUploadMode): EditorWorkflowProduct {
  return EDITOR_WORKFLOW_PRODUCTS.find((p) => p.mode === mode) ?? EDITOR_WORKFLOW_PRODUCTS[0]!;
}

export function workflowChooserModes(): EditorPostUploadMode[] {
  return EDITOR_WORKFLOW_PRODUCTS.map((p) => p.mode);
}
