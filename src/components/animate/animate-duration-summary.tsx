"use client";

import type { TranslationKey } from "@/i18n";
import { getActiveLocale } from "@/i18n";
import {
  formatDurationSeconds,
  getTransitionCount,
  getTotalVideoDurationSeconds,
} from "@/lib/animation-duration";

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type AnimateDurationSummaryProps = {
  t: TFn;
  imageCount: number;
  secondsPerTransition: number;
  showExplanation?: boolean;
  className?: string;
};

export function AnimateDurationSummary({
  t,
  imageCount,
  secondsPerTransition,
  showExplanation = true,
  className = "",
}: AnimateDurationSummaryProps) {
  const locale = getActiveLocale();
  const transitionCount = getTransitionCount(imageCount);
  const per = Math.max(0, Math.round(Number(secondsPerTransition)));
  const totalSeconds = getTotalVideoDurationSeconds(imageCount, per);
  const durationLabel = formatDurationSeconds(totalSeconds, locale === "nl" ? "nl" : "en");

  return (
    <div className={`space-y-1 text-xs text-zinc-700 sm:text-sm ${className}`.trim()}>
      <p>{t("animate.duration.secondsPerTransition", { seconds: per })}</p>
      <p>{t("animate.duration.transitions", { count: transitionCount })}</p>
      <p className="font-medium text-zinc-800">
        {t("animate.duration.total", { duration: durationLabel })}
      </p>
      {showExplanation ? (
        <p className="text-zinc-500">{t("animate.duration.explanation")}</p>
      ) : null}
    </div>
  );
}
