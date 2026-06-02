"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  TEXT_LANGUAGE_RENDER_STEP_I18N,
  type TextLanguageRenderProgressView,
  type TextLanguageRenderStepStatus,
} from "@/lib/text-language-render-progress";

export type TextLanguageRenderProgressPanelProps = {
  progress: TextLanguageRenderProgressView;
  className?: string;
  defaultExpanded?: boolean;
};

function StepIcon({ status }: { status: TextLanguageRenderStepStatus }) {
  if (status === "completed") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white"
      aria-hidden
    />
  );
}

export function TextLanguageRenderProgressPanel({
  progress,
  className = "",
  defaultExpanded,
}: TextLanguageRenderProgressPanelProps) {
  const t = useActiveTranslator();
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? (progress.phase === "running" || progress.phase === "failed")
  );

  useEffect(() => {
    if (progress.phase === "running" || progress.phase === "failed") {
      const timer = window.setTimeout(() => setExpanded(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [progress.phase]);

  const titleKey = useMemo(
    () =>
      progress.pipeline === "text_rerender"
        ? "instant.textLanguageProgress.textRerender.title"
        : "instant.textLanguageProgress.languageExport.title",
    [progress.pipeline]
  );

  if (progress.phase === "idle") {
    return null;
  }

  const percentLabel =
    progress.percent != null ? `${progress.percent}%` : t("instant.textLanguageProgress.percentPending");

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          {progress.phase === "running" ? (
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900">{t(titleKey as never)}</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {progress.activeStepId
                ? t(TEXT_LANGUAGE_RENDER_STEP_I18N[progress.activeStepId] as never)
                : progress.phase === "completed"
                  ? t(TEXT_LANGUAGE_RENDER_STEP_I18N.completed as never)
                  : null}
            </p>
            {progress.phase === "running" && progress.estimatedWaitSeconds != null ?
              <p className="mt-1 text-[11px] text-zinc-500">
                {t("instant.textLanguageProgress.estimatedWait", {
                  seconds: progress.estimatedWaitSeconds,
                })}
              </p>
            : null}
          </div>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-zinc-800">{percentLabel}</p>
      </div>

      {progress.percent != null ? (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              progress.phase === "failed"
                ? "bg-red-500"
                : progress.phase === "completed"
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400"
            }`}
            style={{ width: `${Math.max(progress.phase === "completed" ? 100 : 4, progress.percent)}%` }}
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-zinc-700 hover:text-zinc-900"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>{t("instant.textLanguageProgress.toggleDetails")}</span>
        <span aria-hidden>{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded ? (
        <ol className="mt-2 space-y-2">
          {progress.steps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-2">
              <StepIcon status={step.status} />
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-xs ${
                    step.status === "active"
                      ? "font-semibold text-zinc-900"
                      : step.status === "failed"
                        ? "font-semibold text-red-800"
                        : step.status === "completed"
                          ? "text-zinc-700"
                          : "text-zinc-500"
                  }`}
                >
                  {t("instant.textLanguageProgress.stepNumber", { number: index + 1 })}
                  {" · "}
                  {t(TEXT_LANGUAGE_RENDER_STEP_I18N[step.id] as never)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {progress.phase === "failed" && progress.errorMessage ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {progress.errorMessage}
        </p>
      ) : null}
    </div>
  );
}
