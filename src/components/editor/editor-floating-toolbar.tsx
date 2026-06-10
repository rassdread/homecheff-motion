"use client";

import type { TranslationKey } from "@/i18n";
import type { EditorHumanActionId } from "@/lib/editor-human-first";
import { useActiveTranslator } from "@/i18n/client";

const TOOLBAR_ACTIONS: EditorHumanActionId[] = [
  "edit_appearance",
  "replace",
  "remove",
  "prepare_animation",
  "background_replace",
  "duplicate",
  "more",
];

type Props = {
  visible: boolean;
  onAction: (actionId: EditorHumanActionId) => void;
};

export function EditorFloatingToolbar({ visible, onAction }: Props) {
  const t = useActiveTranslator();

  if (!visible) {
    return null;
  }

  const labels: Record<string, TranslationKey> = {
    edit_appearance: "editor.human.toolbar.edit",
    replace: "editor.human.toolbar.replace",
    remove: "editor.human.toolbar.remove",
    prepare_animation: "editor.human.toolbar.animate",
    background_replace: "editor.human.action.replaceBackground",
    duplicate: "editor.human.action.duplicate",
    more: "editor.human.toolbar.more",
  };

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-white/80 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md"
      role="toolbar"
      aria-label={t("editor.human.toolbar.label")}
    >
      {TOOLBAR_ACTIONS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onAction(id)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067B1]"
        >
          {t(labels[id]!)}
        </button>
      ))}
    </div>
  );
}
