import { planEditorSmartReplace } from "@/lib/editor-smart-replace";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorMagicReplacePreview,
} from "@/types/homecheff-visual-editor";

export type MagicReplaceInput = {
  prompt?: string;
  replacementImageUrl?: string;
};

export function buildMagicReplacePreview(
  layer: EditorCanvasLayer,
  input: MagicReplaceInput
): EditorMagicReplacePreview {
  const plan = planEditorSmartReplace({
    layer,
    prompt: input.prompt,
    replacementImageUrl: input.replacementImageUrl,
  });

  return {
    layerId: layer.id,
    prompt: plan.prompt,
    replacementImageUrl: plan.replacementImageUrl,
    ready: plan.ready,
    messageKey: plan.ready ? "editor.v6.magicReplace.ready" : "editor.v6.magicReplace.needsInput",
  };
}

export function attachMagicReplacePreview(
  document: EditorCanvasDocument,
  preview: EditorMagicReplacePreview
): EditorCanvasDocument {
  return {
    ...document,
    productivityState: {
      ...document.productivityState,
      magicReplacePreview: preview,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function clearMagicReplacePreview(document: EditorCanvasDocument): EditorCanvasDocument {
  const rest = { ...document.productivityState };
  delete rest.magicReplacePreview;
  return {
    ...document,
    productivityState: Object.keys(rest).length ? rest : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export const MAGIC_REPLACE_PROMPT_EXAMPLES = [
  "replace globe with football",
  "replace tie with blue tie",
  "replace shirt with chef jacket",
  "replace logo with uploaded logo",
] as const;

export function parseMagicReplacePrompt(prompt: string): MagicReplaceInput {
  const trimmed = prompt.trim();
  return { prompt: trimmed };
}
