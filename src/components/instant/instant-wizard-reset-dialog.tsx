"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  open: boolean;
  processingWarning: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function InstantWizardResetDialog({
  open,
  processingWarning,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instant-wizard-reset-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 id="instant-wizard-reset-title" className="text-base font-semibold text-zinc-900">
          {t("instant.reset.title")}
        </h3>
        <p className="mt-2 text-sm text-zinc-600">{t("instant.reset.body")}</p>
        {processingWarning ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {t("instant.reset.processingWarning")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700"
            onClick={onCancel}
            disabled={busy}
          >
            {t("instant.reset.cancel")}
          </button>
          <button
            type="button"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t("instant.reset.confirmBusy") : t("instant.reset.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
