"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { MotionExecutionRefreshDiff } from "@/types/motion-handoff-execution-consumption";

type Props = {
  open: boolean;
  diff: MotionExecutionRefreshDiff | null;
  loading?: boolean;
  applying?: boolean;
  onClose: () => void;
  onApply: () => void;
};

export function MotionExecutionRefreshDiffModal({
  open,
  diff,
  loading = false,
  applying = false,
  onClose,
  onApply,
}: Props) {
  const t = useActiveTranslator();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="motion-execution-refresh-title"
      >
        <h2 id="motion-execution-refresh-title" className="text-lg font-semibold text-zinc-900">
          {t("motion.handoff.executionConsumption.refreshTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {t("motion.handoff.executionConsumption.refreshSubtitle")}
        </p>

        {loading ?
          <p className="mt-4 text-sm text-zinc-500">{t("motion.handoff.refreshing")}</p>
        : null}

        {!loading && diff && !diff.hasChanges ?
          <p className="mt-4 text-sm text-zinc-600">
            {t("motion.handoff.executionConsumption.refreshNoChanges")}
          </p>
        : null}

        {!loading && diff?.hasChanges ?
          <ul className="mt-4 space-y-2">
            {diff.items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
              >
                <span className="font-semibold">
                  {t(item.labelKey as TranslationKey, item.labelParams)}
                </span>
                {item.before !== undefined && item.after !== undefined ?
                  <div className="mt-1 text-zinc-600">
                    {item.before} → {item.after}
                  </div>
                : null}
              </li>
            ))}
          </ul>
        : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
            onClick={onClose}
            disabled={applying}
          >
            {t("motion.handoff.executionConsumption.refreshCancel")}
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={onApply}
            disabled={loading || applying || !diff?.hasChanges}
          >
            {applying
              ? t("motion.handoff.refreshing")
              : t("motion.handoff.executionConsumption.refreshApply")}
          </button>
        </div>
      </div>
    </div>
  );
}
