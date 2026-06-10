import type { EditorUserIntent } from "@/lib/editor-workspace-modes";

export const EDITOR_USER_INTENTS: EditorUserIntent[] = [
  "edit_photo",
  "combine_images",
  "make_gif",
  "prepare_motion",
  "export_print",
];

export const EDITOR_INTENT_LABEL_KEYS: Record<EditorUserIntent, string> = {
  edit_photo: "editor.v5.intent.editPhoto",
  combine_images: "editor.v5.intent.combineImages",
  make_gif: "editor.v5.intent.makeGif",
  prepare_motion: "editor.v5.intent.prepareMotion",
  export_print: "editor.v5.intent.exportPrint",
};

export const EDITOR_INTENT_HINT_KEYS: Record<EditorUserIntent, string> = {
  edit_photo: "editor.v5.intent.editPhotoHint",
  combine_images: "editor.v5.intent.combineImagesHint",
  make_gif: "editor.v5.intent.makeGifHint",
  prepare_motion: "editor.v5.intent.prepareMotionHint",
  export_print: "editor.v5.intent.exportPrintHint",
};

const TECHNICAL_TERMS = [
  "segmentation",
  "instance mask",
  "hierarchy node",
  "onnx",
  "bbox",
  "dpi",
  "bleed",
  "color profile",
];

export function isAdvancedExportTerm(label: string): boolean {
  const lower = label.toLowerCase();
  return TECHNICAL_TERMS.some((t) => lower.includes(t));
}

export function userFacingExportLabel(advancedOpen: boolean, technicalLabel: string, humanLabel: string): string {
  return advancedOpen ? technicalLabel : humanLabel;
}
