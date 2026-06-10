"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  visible: boolean;
  refining: boolean;
  onAddPoint: () => void;
  onRemovePoint: () => void;
  onReset: () => void;
  onAccept: () => void;
};

export function EditorRefinePointsPanel({
  visible,
  refining,
  onAddPoint,
  onRemovePoint,
  onReset,
  onAccept,
}: Props) {
  const t = useActiveTranslator();

  if (!visible) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <button
        type="button"
        disabled={refining}
        onClick={onAddPoint}
        className="min-h-9 rounded-full bg-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {t("editor.sam2.addPoint")}
      </button>
      <button
        type="button"
        disabled={refining}
        onClick={onRemovePoint}
        className="min-h-9 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-50"
      >
        {t("editor.sam2.removePoint")}
      </button>
      <button
        type="button"
        disabled={refining}
        onClick={onReset}
        className="min-h-9 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-50"
      >
        {t("editor.sam2.resetSelection")}
      </button>
      <button
        type="button"
        disabled={refining}
        onClick={onAccept}
        className="min-h-9 rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {t("editor.sam2.accept")}
      </button>
    </div>
  );
}
