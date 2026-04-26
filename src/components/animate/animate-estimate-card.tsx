"use client";

import type { TranslationKey } from "@/i18n";
import { getActiveLocale } from "@/i18n";
import {
  formatDurationSeconds,
  getTransitionCount,
} from "@/lib/animation-duration";
import { CREDIT_USD, MIN_ANIMATION_IMAGES } from "@/lib/animation-presets";

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type AnimateEstimateCardMode = "preset" | "advanced" | "final";

export type AnimateEstimateCardProps = {
  t: TFn;
  mode: AnimateEstimateCardMode;
  imageCount: number;
  secondsPerTransition: number;
  creditsPerSecond: number;
  maxCredits: number;
  maxUsd: number;
  resolution: string;
  maxImages: number;
  maxTransitions: number;
  /** When set (e.g. advanced multi-rate), overrides computed current credits. */
  currentCreditsOverride?: number;
  currentUsdOverride?: number;
  showExplanation?: boolean;
  compact?: boolean;
  className?: string;
};

function transitionsForEstimate(imageCount: number, maxTransitions: number): number {
  if (imageCount < MIN_ANIMATION_IMAGES) {
    return 0;
  }
  return Math.min(getTransitionCount(imageCount), maxTransitions);
}

export function AnimateEstimateCard({
  t,
  mode,
  imageCount,
  secondsPerTransition,
  creditsPerSecond,
  maxCredits,
  maxUsd,
  resolution,
  maxImages,
  maxTransitions,
  currentCreditsOverride,
  currentUsdOverride,
  showExplanation = false,
  compact = false,
  className = "",
}: AnimateEstimateCardProps) {
  const locale = getActiveLocale() === "nl" ? "nl" : "en";
  const per = Math.max(0, Math.round(Number(secondsPerTransition)));
  const tc = transitionsForEstimate(imageCount, maxTransitions);
  const totalSeconds = tc * per;
  const durationLabel = formatDurationSeconds(totalSeconds, locale);

  const currentCredits =
    currentCreditsOverride ??
    Math.round(tc * per * Math.max(0, Number(creditsPerSecond)));
  const currentUsdNumber =
    currentUsdOverride !== undefined
      ? currentUsdOverride
      : Math.round(currentCredits * CREDIT_USD * 10000) / 10000;

  const textSize = compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm";
  const gap = compact ? "space-y-1" : "space-y-1.5";

  const rootExtra = className.trim();

  if (mode === "final") {
    if (imageCount < MIN_ANIMATION_IMAGES) {
      return (
        <div
          className={`rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-zinc-700 ${textSize} ${rootExtra}`.trim()}
        >
          <p className="font-semibold text-zinc-900">{t("animate.estimate.finalTitle")}</p>
          <p className="mt-2">{t("animate.estimate.finalStartHint")}</p>
        </div>
      );
    }
    return (
      <div
        className={`rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3 text-zinc-800 ${textSize} ${rootExtra}`.trim()}
      >
        <p className="font-semibold text-emerald-900">{t("animate.estimate.finalTitle")}</p>
        <p className="mt-2">
          {t("animate.estimate.imagesTransitions", {
            images: imageCount,
            transitions: tc,
          })}
        </p>
        <p className="mt-1">{t("animate.estimate.totalVideo", { duration: durationLabel })}</p>
        <p className="mt-1">
          {t("animate.estimate.estimatedCredits", { credits: currentCredits })}
        </p>
        <p className="mt-1">
          {t("animate.estimate.estimatedCost", { usd: `$${currentUsdNumber.toFixed(2)}` })}
        </p>
      </div>
    );
  }

  if (mode === "advanced") {
    if (imageCount < MIN_ANIMATION_IMAGES) {
      return (
        <div
          className={`rounded-lg border border-violet-200 bg-white/80 p-3 text-zinc-700 ${textSize} ${rootExtra}`.trim()}
        >
          <p className="font-semibold text-violet-900">{t("animate.estimate.sectionCurrent")}</p>
          <p className="mt-2">{t("animate.estimate.needTwoForCalc")}</p>
        </div>
      );
    }
    return (
      <div
        className={`rounded-lg border border-violet-200 bg-white/90 p-3 text-zinc-800 ${textSize} ${rootExtra}`.trim()}
      >
        <p className="font-semibold text-violet-900">{t("animate.estimate.sectionCurrent")}</p>
        <p className="mt-2">
          {t("animate.estimate.imagesTransitions", {
            images: imageCount,
            transitions: tc,
          })}
        </p>
        <p className="mt-1">{t("animate.estimate.totalVideo", { duration: durationLabel })}</p>
        <p className="mt-1">
          {t("animate.estimate.estimatedCredits", { credits: currentCredits })}
        </p>
        <p className="mt-1">
          {t("animate.estimate.estimatedCost", { usd: `$${currentUsdNumber.toFixed(2)}` })}
        </p>
        {showExplanation ? (
          <p className="mt-2 text-zinc-500">{t("animate.duration.explanation")}</p>
        ) : null}
      </div>
    );
  }

  /* preset inline */
  return (
    <div
      className={`mt-2 border-t border-emerald-100/80 pt-2 ${gap} ${textSize} text-zinc-700 ${rootExtra}`.trim()}
    >
      <p>{t("animate.preset.field.resolution", { value: resolution })}</p>
      <p>{t("animate.estimate.perTransitionSeconds", { seconds: per })}</p>
      <p>{t("animate.preset.field.maxImages", { max: maxImages })}</p>
      <p>{t("animate.preset.field.maxTransitions", { max: maxTransitions })}</p>

      {imageCount >= MIN_ANIMATION_IMAGES ? (
        <>
          <p className="pt-1 font-semibold text-zinc-900">{t("animate.estimate.sectionCurrent")}</p>
          <p>
            {t("animate.estimate.imagesTransitions", {
              images: imageCount,
              transitions: tc,
            })}
          </p>
          <p>{t("animate.estimate.totalVideo", { duration: durationLabel })}</p>
          <p>
            {t("animate.estimate.creditsSlashUsd", {
              credits: currentCredits,
              usd: `$${currentUsdNumber.toFixed(2)}`,
            })}
          </p>
        </>
      ) : (
        <p className="pt-1 text-zinc-500">{t("animate.estimate.uploadMinPresetHint")}</p>
      )}

      <p className="pt-1 font-semibold text-zinc-900">{t("animate.estimate.sectionMax")}</p>
      <p>
        {t("animate.estimate.maxCreditsSlashUsd", {
          credits: maxCredits,
          usd: `$${maxUsd.toFixed(2)}`,
        })}
      </p>
    </div>
  );
}
