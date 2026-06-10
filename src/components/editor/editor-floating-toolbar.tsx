"use client";

import type { TranslationKey } from "@/i18n";
import { resolveContextualToolbarActionIds } from "@/lib/editor-ux-cleanup";
import type { EditorHumanActionId } from "@/lib/editor-human-first";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  visible: boolean;
  layer: EditorCanvasLayer | null;
  onAction: (actionId: EditorHumanActionId) => void;
};

const LABELS: Partial<Record<EditorHumanActionId, TranslationKey>> = {
  edit_appearance: "editor.human.toolbar.edit",
  replace: "editor.human.toolbar.replace",
  remove: "editor.human.toolbar.remove",
  prepare_animation: "editor.human.toolbar.animate",
  background_replace: "editor.human.action.replaceBackground",
  background_cleanup: "editor.human.action.cleanup",
  duplicate: "editor.human.action.duplicate",
  logo_replace: "editor.human.action.replace",
  logo_move: "editor.human.action.move",
  logo_resize: "editor.human.action.resize",
  move: "editor.human.action.move",
  resize: "editor.human.action.resize",
  more: "editor.human.toolbar.more",
};

export function EditorFloatingToolbar({ visible, layer, onAction }: Props) {
  const t = useActiveTranslator();

  if (!visible || !layer) {
    return null;
  }

  const actions = resolveContextualToolbarActionIds(layer);

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-white/80 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md"
      role="toolbar"
      aria-label={t("editor.human.toolbar.label")}
    >
      {actions.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onAction(id)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067B1]"
        >
          {t(LABELS[id] ?? ("editor.human.toolbar.more" as TranslationKey))}
        </button>
      ))}
    </div>
  );
}
