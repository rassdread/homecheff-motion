"use client";

import { useActiveTranslator } from "@/i18n/client";
import { EDITOR_ALIGNMENT_ACTIONS, type EditorAlignmentAction } from "@/types/homecheff-visual-editor";

type Props = {
  onAlign: (action: EditorAlignmentAction) => void;
};

const ALIGNMENT_LABEL_KEYS: Record<EditorAlignmentAction, string> = {
  center: "editor.v6.align.center",
  left: "editor.v6.align.left",
  right: "editor.v6.align.right",
  top: "editor.v6.align.top",
  bottom: "editor.v6.align.bottom",
  distribute_h: "editor.v6.align.distributeH",
  distribute_v: "editor.v6.align.distributeV",
};

export function EditorAlignmentToolbar({ onAlign }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.v6.align.title" as never)}
      </p>
      <div className="flex flex-wrap gap-2">
        {EDITOR_ALIGNMENT_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAlign(action)}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            {t(ALIGNMENT_LABEL_KEYS[action] as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
