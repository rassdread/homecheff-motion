"use client";

import { useActiveTranslator } from "@/i18n/client";
import { isBackgroundToolHidden } from "@/lib/editor-broken-features";
import { BACKGROUND_TOOL_IDS, BACKGROUND_TOOL_LABEL_KEYS } from "@/lib/editor-v6-background-tools";
import type { EditorBackgroundToolId } from "@/types/homecheff-visual-editor";

type Props = {
  onSelect: (toolId: EditorBackgroundToolId) => void;
};

export function EditorBackgroundToolsPanel({ onSelect }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <p className="text-sm font-semibold text-emerald-900">{t("editor.v6.background.title" as never)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BACKGROUND_TOOL_IDS.filter((id) => !isBackgroundToolHidden(id)).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            {t(BACKGROUND_TOOL_LABEL_KEYS[id] as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
