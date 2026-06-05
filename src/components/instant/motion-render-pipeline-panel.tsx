"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  MOTION_RENDER_PIPELINE_STEP_I18N,
  resolveMotionRenderPipelineProgress,
  type MotionRenderPipelineContext,
  type MotionRenderPipelineStepStatus,
} from "@/lib/motion-render-pipeline-progress";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type MotionRenderPipelinePanelProps = {
  snapshot: InstantPremiumStatusResponse | null;
  pipelineContext?: MotionRenderPipelineContext | null;
  className?: string;
};

function StepIcon({ status }: { status: MotionRenderPipelineStepStatus }) {
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
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-sky-600" aria-hidden>
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

export function MotionRenderPipelinePanel({
  snapshot,
  pipelineContext,
  className = "",
}: MotionRenderPipelinePanelProps) {
  const t = useActiveTranslator();
  const progress = useMemo(
    () => resolveMotionRenderPipelineProgress({ snapshot, context: pipelineContext }),
    [snapshot, pipelineContext]
  );

  if (progress.phase === "idle" || progress.steps.length === 0) {
    return null;
  }

  const failedStep = progress.failedStepId
    ? progress.steps.find((s) => s.id === progress.failedStepId)
    : null;

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {progress.showRenderingMessage ?
        <p className="text-xs leading-relaxed text-zinc-700">
          {t("instant.renderPipeline.renderingMessage")}
        </p>
      : null}

      {progress.estimatedRemainingSeconds != null ?
        <p className="mt-2 text-xs text-zinc-600">
          {t("instant.renderPipeline.estimatedRemaining", {
            minutes: String(Math.max(1, Math.round(progress.estimatedRemainingSeconds / 60))),
          })}
        </p>
      : null}

      <ul className={`space-y-1.5 ${progress.showRenderingMessage ? "mt-3" : ""}`}>
        {progress.steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-xs text-zinc-800">
            <StepIcon status={step.status} />
            <span
              className={
                step.status === "active"
                  ? "font-semibold text-sky-900"
                  : step.status === "failed"
                    ? "font-semibold text-red-900"
                    : step.status === "completed"
                      ? "text-zinc-600"
                      : "text-zinc-500"
              }
            >
              {t(MOTION_RENDER_PIPELINE_STEP_I18N[step.id] as never)}
            </span>
          </li>
        ))}
      </ul>

      {progress.phase === "failed" && failedStep ?
        <p className="mt-3 text-xs font-medium text-red-900">
          {t("instant.renderPipeline.stepFailed", {
            step: t(MOTION_RENDER_PIPELINE_STEP_I18N[failedStep.id] as never),
          })}
        </p>
      : null}
    </div>
  );
}
