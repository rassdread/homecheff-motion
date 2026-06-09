"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorObjectOperation } from "@/types/homecheff-visual-editor";

type Props = {
  onSaveDraft: () => void;
  onDownload: () => void;
  onBack: () => void;
  saving?: boolean;
};

export function EditorToolbar({ onSaveDraft, onDownload, onBack, saving = false }: Props) {
  const t = useActiveTranslator();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[40px] rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-800"
      >
        {t("editor.canvas.back")}
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="min-h-[40px] rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-800"
        >
          {t("editor.canvas.download")}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSaveDraft}
          className="min-h-[40px] rounded-full bg-[#0067B1] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? t("button.loading") : t("editor.canvas.saveDraft")}
        </button>
      </div>
    </div>
  );
}

export function editorToolbarHintForOperation(operation: EditorObjectOperation): string {
  return `editor.canvas.tool.${operation}`;
}
