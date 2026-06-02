"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { InstantVideoRepairFeedback } from "@/hooks/use-instant-video-repair";
import type { InstantRepairUiView } from "@/lib/instant-repair-ui-state";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

type Props = {
  className?: string;
  uiView: InstantRepairUiView;
  repairInFlight: boolean;
  feedback: InstantVideoRepairFeedback;
  snapshot: InstantPremiumStatusResponse | null;
  isAdmin?: boolean;
  disabled?: boolean;
  disabledReasonKey?: string | null;
  onRepair: () => void;
};

export function InstantVideoRepairCard({
  className = "",
  uiView,
  repairInFlight,
  feedback,
  snapshot,
  isAdmin = false,
  disabled = false,
  disabledReasonKey = null,
  onRepair,
}: Props) {
  const t = useActiveTranslator();

  if (uiView === "none" || uiView === "completed") {
    return null;
  }

  const isRunning = uiView === "repair_running";
  const stageKey =
    snapshot?.videoRepairUserMessageKey ??
    feedback.userMessageKey ??
    (isRunning ? "instant.videoRepair.stage.started" : null);
  const stageLabel = stageKey ? t(stageKey as never) : null;
  const updatedAt = snapshot?.videoRepairUpdatedAt ?? null;
  const showSpinner = repairInFlight || feedback.kind === "starting";

  const userErrorKey =
    feedback.kind === "error"
      ? feedback.userMessageKey
      : feedback.kind === "already_running"
        ? feedback.userMessageKey
        : null;

  return (
    <div
      className={`rounded-xl border p-4 ${className} ${
        isRunning
          ? "border-sky-200 bg-sky-50"
          : userErrorKey
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <h3 className="text-sm font-semibold text-zinc-900">{t("instant.videoRepair.cardTitle")}</h3>
      {!isRunning ? (
        <p className="mt-1 text-xs leading-snug text-zinc-600">{t("instant.videoRepair.hint")}</p>
      ) : null}

      {isRunning ? (
        <div className="mt-3 flex items-start gap-2">
          <span
            className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-600 border-t-transparent"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            {stageLabel ? (
              <p className="text-sm font-medium text-sky-950">{stageLabel}</p>
            ) : (
              <p className="text-sm font-medium text-sky-950">{t("instant.videoRepair.starting")}</p>
            )}
            {updatedAt ? (
              <p className="mt-1 text-[10px] text-zinc-500" suppressHydrationWarning>
                {new Date(updatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled || showSpinner}
            onClick={onRepair}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showSpinner ? (
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"
                aria-hidden
              />
            ) : null}
            {showSpinner ? t("instant.videoRepair.starting") : t("instant.videoRepair.cta")}
          </button>
          {disabled && disabledReasonKey ? (
            <p className="mt-2 text-xs text-amber-900">{t(disabledReasonKey as never)}</p>
          ) : null}
          {feedback.kind === "starting" || feedback.kind === "started" ? (
            <p className="mt-2 text-xs font-medium text-emerald-900">
              {t((feedback.userMessageKey ?? "instant.videoRepair.starting") as never)}
            </p>
          ) : null}
        </>
      )}

      {userErrorKey ? (
        <p className="mt-2 text-xs text-red-800">{t(userErrorKey as never)}</p>
      ) : null}

      {isAdmin && feedback.adminDetail ? (
        <pre className="mt-2 max-h-36 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[10px] text-zinc-700">
          {feedback.adminDetail}
        </pre>
      ) : null}

      {isAdmin && snapshot?.repairAdminDetail && isRunning ? (
        <pre className="mt-2 max-h-36 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[10px] text-zinc-700">
          {JSON.stringify(snapshot.repairAdminDetail, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
