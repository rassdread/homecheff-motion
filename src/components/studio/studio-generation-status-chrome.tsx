"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  normalizeStudioGenerationUxStatus,
  studioGenerationAllowsContinueEditing,
  type StudioGenerationUxState,
} from "@/lib/studio-generation-ux-status";

type Props = {
  status?: string | null;
  busy?: boolean;
  label?: string;
  onRetry?: () => void;
  className?: string;
};

const LABEL_KEYS: Record<StudioGenerationUxState, TranslationKey> = {
  ready: "studio.generation.ux.ready",
  queued: "studio.generation.ux.queued",
  generating: "studio.generation.ux.generating",
  processing: "studio.generation.ux.processing",
  completed: "studio.generation.ux.completed",
  failed: "studio.generation.ux.failed",
  cancelled: "studio.generation.ux.cancelled",
};

const TONE: Record<StudioGenerationUxState, string> = {
  ready: "border-zinc-200 bg-zinc-50 text-zinc-700",
  queued: "border-amber-200 bg-amber-50 text-amber-950",
  generating: "border-sky-200 bg-sky-50 text-sky-950",
  processing: "border-sky-200 bg-sky-50 text-sky-950",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  failed: "border-red-200 bg-red-50 text-red-900",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function StudioGenerationStatusChrome({
  status,
  busy = false,
  label,
  onRetry,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const state = normalizeStudioGenerationUxStatus(status, { busy });
  const canContinue = studioGenerationAllowsContinueEditing(state);

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${TONE[state]} ${className}`}
      data-testid="studio-generation-status"
      data-generation-state={state}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {label ? `${label} · ` : null}
          {t(LABEL_KEYS[state])}
        </p>
        {state === "failed" && onRetry ?
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-red-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-800"
            data-testid="studio-generation-retry"
          >
            {t("studio.generation.ux.retry")}
          </button>
        : null}
      </div>
      {state === "generating" || state === "queued" || state === "processing" ?
        <p className="mt-1 opacity-90">
          {canContinue ?
            t("studio.generation.ux.canContinue")
          : t("studio.generation.ux.wait")}
        </p>
      : null}
      {state === "failed" ?
        <p className="mt-1 opacity-90">{t("studio.generation.ux.failedHint")}</p>
      : null}
    </div>
  );
}
