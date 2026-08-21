"use client";

/**
 * S2G — Afronden hub: human finish surface over existing engines.
 * Does not call providers on mount. Primary CTA navigates to existing render tooling.
 */

import { useEffect, useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  resolveStudioFinishPlan,
  resolveStudioFinishSuccessActions,
  inferFinishOrigin,
} from "@/lib/studio-finish-resolve";
import { trackStudioFinishEvent } from "@/lib/studio-finish-analytics";
import { stageLinkForFinishIssue } from "@/types/studio-finish";
import type { StudioProductionStageId } from "@/lib/studio-production-stages";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioToolId } from "@/lib/studio-tool-id";

type Props = {
  storyboard: StudioStoryboardDetail;
  hasCompletedFinal?: boolean;
  finalVideoUrl?: string | null;
  motionProjectId?: string | null;
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  growthLeadId?: string | null;
  approximateCredits?: number | null;
  onGoStage?: (stage: StudioProductionStageId) => void;
  onSelectTool?: (tool: StudioToolId) => void;
};

export function StudioFinishHub({
  storyboard,
  hasCompletedFinal = false,
  finalVideoUrl = null,
  motionProjectId = null,
  returnUrl = null,
  homecheffItemId = null,
  growthLeadId = null,
  approximateCredits = null,
  onGoStage,
  onSelectTool,
}: Props) {
  const t = useActiveTranslator();
  const origin = useMemo(
    () =>
      inferFinishOrigin({
        homecheffItemId,
        growthLeadId,
        returnUrl,
      }),
    [growthLeadId, homecheffItemId, returnUrl]
  );

  const plan = useMemo(
    () =>
      resolveStudioFinishPlan({
        storyboard,
        hasCompletedFinal,
        approximateCredits,
        intent: {
          origin,
          motionProjectId,
          returnUrl,
          homecheffItemId,
          growthLeadId,
          hasExistingOutput: hasCompletedFinal,
        },
      }),
    [
      approximateCredits,
      growthLeadId,
      hasCompletedFinal,
      homecheffItemId,
      motionProjectId,
      origin,
      returnUrl,
      storyboard,
    ]
  );

  const successActions = useMemo(
    () =>
      resolveStudioFinishSuccessActions({
        origin,
        returnUrl,
        homecheffItemId,
        outputType: plan.output.outputType === "image" ? "image" : "video",
      }),
    [homecheffItemId, origin, plan.output.outputType, returnUrl]
  );

  useEffect(() => {
    trackStudioFinishEvent("studio_finish_view", {
      mode: plan.mode,
      adapter: plan.adapterId,
      ready: plan.primaryActionEnabled,
    });
  }, [plan.adapterId, plan.mode, plan.primaryActionEnabled]);

  const handlePrimary = () => {
    if (!plan.primaryActionEnabled) return;
    trackStudioFinishEvent(
      hasCompletedFinal ? "studio_finish_new_version" : "studio_finish_start",
      { mode: plan.mode }
    );
    onSelectTool?.(hasCompletedFinal ? "versions" : "render");
  };

  return (
    <section
      className="studio-finish-hub flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
      aria-labelledby="studio-finish-hub-title"
      data-finish-mode={plan.mode}
      data-finish-adapter={plan.adapterId}
      data-provider-calls="0"
    >
      <div>
        <h2
          id="studio-finish-hub-title"
          className="text-lg font-semibold tracking-tight text-zinc-900"
        >
          {t("studio.finish.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.finish.subtitle")}</p>
      </div>

      {/* Preview / existing result */}
      {finalVideoUrl ? (
        <div className="overflow-hidden rounded-xl bg-zinc-950">
          <p className="px-3 pt-2 text-xs font-medium text-zinc-300">
            {t("studio.finish.existing.latestVideo")}
          </p>
          <video
            src={finalVideoUrl}
            controls
            playsInline
            className="aspect-video w-full object-contain"
            preload="metadata"
          />
        </div>
      ) : hasCompletedFinal ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-700">
          <p className="font-medium">{t("studio.finish.existing.latestVideo")}</p>
          <p className="mt-1 text-zinc-600">{t("studio.finish.existing.openToPreview")}</p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
            onClick={() => onSelectTool?.("export")}
          >
            {t("studio.finish.success.download")}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          {t("studio.finish.preview.noneYet")}
        </div>
      )}

      {/* Readiness */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.finish.readiness.title")}</h3>
        <ul className="mt-2 space-y-1.5" aria-label={t("studio.finish.readiness.title")}>
          {plan.readiness.stages.map((row) => {
            const mark =
              row.status === "READY" ? "✓" : row.status === "NEEDS_ATTENTION" ? "!" : "–";
            const statusKey =
              row.status === "READY"
                ? "studio.finish.readiness.ready"
                : row.status === "NEEDS_ATTENTION"
                  ? "studio.finish.readiness.needsAttention"
                  : row.status === "IN_PROGRESS"
                    ? "studio.finish.readiness.inProgress"
                    : "studio.finish.readiness.incomplete";
            return (
              <li key={row.stageId} className="flex items-start gap-2 text-sm text-zinc-700">
                <span aria-hidden className="mt-0.5 shrink-0">
                  {mark}
                </span>
                <span>
                  {t(`studio.productionStage.${row.stageId}` as "studio.productionStage.story")}
                  {` — ${t(statusKey as "studio.finish.readiness.ready")}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Blockers */}
      {plan.blockingIssues.length > 0 ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
          role="alert"
        >
          <p className="text-sm font-semibold text-amber-950">{t("studio.finish.blockers.title")}</p>
          <ul className="mt-2 space-y-2">
            {plan.blockingIssues.map((issue) => {
              const link = stageLinkForFinishIssue(issue.stageId);
              return (
                <li key={issue.code} className="text-sm text-amber-950">
                  <span>
                    {t(`studio.finish.issue.${issue.code}` as "studio.finish.issue.NO_SCENES")}
                  </span>
                  <button
                    type="button"
                    className="ml-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52] underline-offset-2 hover:underline"
                    onClick={() => {
                      trackStudioFinishEvent("studio_finish_blocker_click", {
                        issue: issue.code,
                        stage: issue.stageId,
                      });
                      onGoStage?.(link.stage);
                    }}
                  >
                    {t(link.labelKey as "studio.finish.fix.goVisuals")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Warnings */}
      {plan.warnings.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
          <p className="text-sm font-semibold text-zinc-800">{t("studio.finish.warnings.title")}</p>
          <ul className="mt-1 list-inside list-disc text-sm text-zinc-600">
            {plan.warnings.slice(0, 4).map((w) => (
              <li key={w.code}>
                {t(`studio.finish.issue.${w.code}` as "studio.finish.issue.NO_SCENES")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Output summary */}
      <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">{t("studio.finish.output.title")}</p>
        <p className="mt-1">
          {t("studio.finish.output.videoApprox", {
            seconds: String(plan.output.approximateDurationSeconds ?? 0),
            scenes: String(plan.output.sceneCount),
          })}
        </p>
        {plan.output.languageHint ? (
          <p className="mt-0.5 text-zinc-600">
            {t("studio.finish.output.language")}: {plan.output.languageHint}
          </p>
        ) : null}
      </div>

      {/* Cost */}
      <div className="text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">{t("studio.finish.cost.title")}</p>
        {plan.cost.isFree ? (
          <p className="mt-1">{t("studio.finish.cost.freeDetail")}</p>
        ) : plan.cost.estimatedCredits != null ? (
          <p className="mt-1">
            {t("studio.finish.cost.approxCreditsDetail", {
              credits: String(plan.cost.estimatedCredits),
            })}
          </p>
        ) : (
          <p className="mt-1">{t("studio.finish.cost.usesCredits")}</p>
        )}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        disabled={!plan.primaryActionEnabled}
        onClick={handlePrimary}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white hover:bg-[#005a44] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {t(plan.primaryActionKey as "studio.finish.cta.makeVideo")}
      </button>

      {/* Contextual success actions (shown when output exists) */}
      {hasCompletedFinal ? (
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-sm font-semibold text-zinc-900">{t("studio.finish.success.readyTitle")}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {successActions.map((action) => {
              const className =
                action.prominence === "primary"
                  ? "inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white"
                  : action.prominence === "secondary"
                    ? "inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
                    : "inline-flex min-h-11 items-center justify-center px-2 text-sm font-medium text-[#006D52] underline-offset-2 hover:underline";

              if (action.id === "download") {
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={className}
                    onClick={() => {
                      trackStudioFinishEvent("studio_finish_download", { mode: plan.mode });
                      onSelectTool?.("export");
                    }}
                  >
                    {t(action.labelKey as "studio.finish.success.download")}
                  </button>
                );
              }
              if (action.href) {
                return (
                  <a
                    key={action.id}
                    href={action.href}
                    className={className}
                    onClick={() => {
                      if (action.id === "return_growth") {
                        trackStudioFinishEvent("studio_finish_growth_return");
                      }
                      if (action.id === "use_on_homecheff" || action.id === "return_homecheff") {
                        trackStudioFinishEvent("studio_finish_homecheff");
                      }
                    }}
                  >
                    {t(action.labelKey as "studio.finish.success.download")}
                  </a>
                );
              }
              return (
                <button
                  key={action.id}
                  type="button"
                  className={className}
                  onClick={() => {
                    if (action.id === "continue_editing" || action.id === "continue_in_studio") {
                      onGoStage?.("story");
                    } else if (action.id === "make_variant" || action.id === "new_version") {
                      onSelectTool?.("versions");
                    } else if (action.id === "use_on_homecheff") {
                      trackStudioFinishEvent("studio_finish_homecheff");
                      onSelectTool?.("export");
                    }
                  }}
                >
                  {t(action.labelKey as "studio.finish.success.download")}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-zinc-500">{t("studio.finish.advancedHint")}</p>
    </section>
  );
}
