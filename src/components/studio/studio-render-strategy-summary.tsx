"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import type { StudioRenderStrategyPlan } from "@/types/studio-render-strategy";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  plan?: StudioRenderStrategyPlan;
  variant?: "full" | "compact";
  showShotSplit?: boolean;
  showImages?: boolean;
  showDuration?: boolean;
};

function confidenceClass(confidence: string): string {
  if (confidence === "high") return "text-[#006D52]";
  if (confidence === "medium") return "text-amber-800";
  return "text-zinc-600";
}

export function StudioRenderStrategySummary({
  storyboard,
  characters = [],
  locations = [],
  props = [],
  worlds = [],
  plan: planProp,
  variant = "full",
  showShotSplit = true,
  showImages = true,
  showDuration = true,
}: Props) {
  const t = useActiveTranslator();

  const plan = useMemo(
    () =>
      planProp ??
      buildStudioRenderStrategyPlan({
        storyboard,
        characters,
        locations,
        props,
        worlds,
      }),
    [planProp, storyboard, characters, locations, props, worlds]
  );

  if (storyboard.scenes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.renderStrategy.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.renderStrategy.subtitle")}</p>

      <div className="mt-3 rounded-xl bg-white/90 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.renderStrategy.recommendedApproach")}
        </p>
        <p className="mt-1 text-base font-semibold text-[#0067B1]">
          {t(plan.strategyLabelKey as TranslationKey)}
        </p>
        <p className="mt-1 text-xs text-zinc-700">
          {t(plan.strategyExplanationKey as TranslationKey)}
        </p>
        <p className={`mt-2 text-[11px] font-medium ${confidenceClass(plan.confidence)}`}>
          {t("studio.renderStrategy.confidenceLabel", {
            level: t(`studio.renderStrategy.confidence.${plan.confidence}` as TranslationKey),
          })}
        </p>
      </div>

      {plan.reasons.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.renderStrategy.whyRecommended")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-700">
            {plan.reasons.slice(0, variant === "compact" ? 3 : 5).map((r) => (
              <li key={r.id} className="rounded-lg bg-white/80 px-3 py-2">
                {t(r.reasonKey as TranslationKey, r.reasonParams)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {variant === "full" && plan.warnings.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            {t("studio.renderStrategy.warnings")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-900">
            {plan.warnings.map((w) => (
              <li key={w.id} className="rounded-lg bg-amber-50 px-3 py-2">
                {t(w.reasonKey as TranslationKey, w.reasonParams)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {showDuration && variant === "full" ?
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs text-zinc-700">
            <span className="font-medium text-zinc-900">
              {t("studio.renderStrategy.providerDuration")}
            </span>
            {" — "}
            {t("studio.renderStrategy.durationSeconds", {
              seconds: String(plan.estimatedProviderDurationSeconds),
            })}
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs text-zinc-700">
            <span className="font-medium text-zinc-900">
              {t("studio.renderStrategy.suggestedFinalDuration")}
            </span>
            {" — "}
            {t("studio.renderStrategy.durationSeconds", {
              seconds: String(plan.estimatedFinalDurationSeconds),
            })}
          </div>
          {plan.suggestedSpeedAdjustment ?
            <div className="rounded-lg bg-white/80 px-3 py-2 text-xs text-zinc-700 sm:col-span-2">
              {t("studio.renderStrategy.speedUpEdit", {
                factor: String(plan.suggestedSpeedAdjustment),
              })}
            </div>
          : null}
        </div>
      : null}

      {showShotSplit && plan.suggestedShotSplitting.length > 0 ?
        <div className="mt-3 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.renderStrategy.shotSplit.title")}
          </p>
          {plan.suggestedShotSplitting.map((split) => (
            <div key={split.sceneId} className="rounded-xl border border-zinc-200 bg-white/90 p-3">
              <p className="text-xs font-semibold text-zinc-900">
                {split.sceneTitle}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {t(split.reasonKey as TranslationKey, {
                  count: String(split.suggestedShotCount),
                })}
              </p>
              <ol className="mt-2 space-y-1.5">
                {split.suggestedShots.map((shot) => (
                  <li key={shot.order} className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <span className="font-medium text-[#0067B1]">
                      {t("studio.renderStrategy.shotSplit.shotLabel", {
                        number: String(shot.order),
                      })}
                      {": "}
                    </span>
                    {shot.actionHint}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[10px] text-zinc-500">
                {t("studio.renderStrategy.shotSplit.previewOnly")}
              </p>
            </div>
          ))}
        </div>
      : null}

      {showImages && plan.imageRequirements.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.renderStrategy.imageRequirements")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {plan.imageRequirements
              .filter((r) => r.status !== "present")
              .slice(0, variant === "compact" ? 4 : 8)
              .map((req) => (
                <li
                  key={`${req.sceneId}-${req.role}`}
                  className={`rounded-lg px-3 py-2 ${
                    req.status === "missing"
                      ? "bg-red-50 text-red-900"
                      : "bg-amber-50 text-amber-900"
                  }`}
                >
                  {t(req.labelKey as TranslationKey)}
                  {" — "}
                  {req.sceneTitle}
                  {" · "}
                  {req.status === "missing"
                    ? t("studio.renderStrategy.image.missing")
                    : t("studio.renderStrategy.image.recommended")}
                </li>
              ))}
            {plan.presentImageCount > 0 ?
              <li className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
                {t("studio.renderStrategy.image.presentCount", {
                  count: String(plan.presentImageCount),
                  total: String(plan.requiredImageCount),
                })}
              </li>
            : null}
          </ul>
        </div>
      : null}
    </section>
  );
}
