"use client";

import type { ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorFusionIntentCategory } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  settings: ReactNode;
  actions?: ReactNode;
};

const CATEGORY_SETTINGS_HINT: Partial<Record<EditorFusionIntentCategory, string>> = {
  people_characters: "editor.categoryWorkspace.people",
  animals: "editor.categoryWorkspace.animals",
  products_brands: "editor.categoryWorkspace.products",
  marketing_content: "editor.categoryWorkspace.marketing",
  future_identity: "editor.categoryWorkspace.future",
};

export function EditorFusionCategoryWorkspace({ document, settings, actions }: Props) {
  const t = useActiveTranslator();
  const intent = document.instructionStudioState?.combineIntent;
  const category =
    document.instructionStudioState?.fusionPlan?.category ??
    (intent ? fusionIntentDefinition(intent).category : undefined);
  const hintKey = category ? CATEGORY_SETTINGS_HINT[category] : undefined;

  return (
    <div className="space-y-4" data-testid="editor-fusion-category-workspace" data-category={category}>
      {hintKey ?
        <p className={`rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 ${studioVisual.editorSurface}`}>
          {t(hintKey as never)}
        </p>
      : null}
      <div className="space-y-4">{settings}</div>
      {actions ?
        <div className="sticky bottom-0 border-t border-zinc-200 bg-white/95 py-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:py-0">
          {actions}
        </div>
      : null}
    </div>
  );
}
