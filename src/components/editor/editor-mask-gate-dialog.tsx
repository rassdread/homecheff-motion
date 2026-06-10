"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  open: boolean;
  onRefine: () => void;
  onLasso: () => void;
  onCancel: () => void;
};

export function EditorMaskGateDialog({ open, onRefine, onLasso, onCancel }: Props) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <p className="text-base font-semibold text-slate-900">
          {t("editor.maskGate.title" as never)}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t("editor.maskGate.body" as never)}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRefine}
            className="flex-1 rounded-xl bg-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white"
          >
            {t("editor.maskGate.refine" as never)}
          </button>
          <button
            type="button"
            onClick={onLasso}
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-slate-800"
          >
            {t("editor.maskGate.lasso" as never)}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm text-slate-600"
          >
            {t("editor.maskGate.cancel" as never)}
          </button>
        </div>
      </div>
    </div>
  );
}
