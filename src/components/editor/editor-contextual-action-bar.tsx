"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  EDITOR_UX_V7_NO_SELECTION_LABEL_KEYS,
  EDITOR_UX_V7_OBJECT_ACTION_LABEL_KEYS,
  resolveUxV7NoSelectionActions,
  resolveUxV7ObjectActions,
  uxV7NoSelectionIcon,
  uxV7ObjectActionIcon,
  type EditorUxV7NoSelectionAction,
  type EditorUxV7ObjectAction,
} from "@/lib/editor-ux-v7-contextual";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer | null;
  busy?: boolean;
  onNoSelectionAction: (action: EditorUxV7NoSelectionAction) => void;
  onObjectAction: (action: EditorUxV7ObjectAction) => void;
};

export function EditorContextualActionBar({
  layer,
  busy,
  onNoSelectionAction,
  onObjectAction,
}: Props) {
  const t = useActiveTranslator();

  if (!layer) {
    const actions = resolveUxV7NoSelectionActions();
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("editor.uxV7.contextual.title" as never)}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => onNoSelectionAction(action)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-zinc-50 px-2 py-3 text-center hover:bg-[#0067B1]/10 disabled:opacity-50"
            >
              <span className="text-xl" aria-hidden>
                {uxV7NoSelectionIcon(action)}
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {t(EDITOR_UX_V7_NO_SELECTION_LABEL_KEYS[action] as never)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const actions = resolveUxV7ObjectActions(layer);
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.uxV7.contextual.objectActions" as never)}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={busy}
            onClick={() => onObjectAction(action)}
            className="flex min-h-12 min-w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-[#0067B1]/5 px-3 py-2 hover:bg-[#0067B1]/10 disabled:opacity-50"
          >
            <span className="text-lg" aria-hidden>
              {uxV7ObjectActionIcon(action)}
            </span>
            <span className="text-xs font-semibold text-slate-900">
              {t(EDITOR_UX_V7_OBJECT_ACTION_LABEL_KEYS[action] as never)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
