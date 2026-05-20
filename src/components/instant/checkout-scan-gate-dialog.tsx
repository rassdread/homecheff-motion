"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  open: boolean;
  onWait: () => void;
  onProceedWithout: () => void;
  onBackToReview: () => void;
};

export function CheckoutScanGateDialog({ open, onWait, onProceedWithout, onBackToReview }: Props) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-900">{t("instant.checkoutGate.title")}</h3>
        <p className="mt-2 text-sm text-zinc-600">{t("instant.checkoutGate.body")}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white"
            onClick={onWait}
          >
            {t("instant.checkoutGate.wait")}
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950"
            onClick={onProceedWithout}
          >
            {t("instant.checkoutGate.proceedWithout")}
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-700"
            onClick={onBackToReview}
          >
            {t("instant.checkoutGate.backToReview")}
          </button>
        </div>
      </div>
    </div>
  );
}
