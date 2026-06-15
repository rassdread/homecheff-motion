"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  open: boolean;
  projectTitle: string;
  showExportedWarning?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function HcProjectDeleteDialog({
  open,
  projectTitle,
  showExportedWarning = false,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const t = useActiveTranslator();

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="hc-project-delete-dialog"
    >
      <div className={`w-full max-w-md p-5 shadow-lg ${studioVisual.cardElevated}`} role="alertdialog">
        <h2 className="text-base font-bold text-zinc-900">{t("hcProject.delete.title" as never)}</h2>
        <p className="mt-2 text-sm text-zinc-600">{t("hcProject.delete.message" as never)}</p>
        <p className="mt-3 text-sm font-semibold text-zinc-800">
          {t("hcProject.delete.projectLabel" as never)} {projectTitle}
        </p>
        {showExportedWarning ?
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("hcProject.delete.exportedWarning" as never)}
          </p>
        : null}
        <p className="mt-3 text-xs text-zinc-500">{t("hcProject.delete.cannotUndo" as never)}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 disabled:opacity-50"
          >
            {t("hcProject.delete.cancel" as never)}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            data-testid="hc-project-delete-confirm"
          >
            {t("hcProject.delete.confirm" as never)}
          </button>
        </div>
      </div>
    </div>
  );
}
