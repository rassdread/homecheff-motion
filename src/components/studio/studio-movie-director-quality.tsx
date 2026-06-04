"use client";

import { buildDirectorQualityReport } from "@/lib/studio-movie-director-quality";
import { buildProductionScoreReport } from "@/lib/studio-production-score";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
};

export function StudioMovieDirectorQuality({ storyboard }: Props) {
  const t = useActiveTranslator();
  const report = buildDirectorQualityReport(storyboard);
  const production = buildProductionScoreReport(storyboard);

  const tierClass =
    report.tier === "strong" ? "text-emerald-800 bg-emerald-50 border-emerald-200"
    : report.tier === "good" ? "text-[#006D52] bg-[#006D52]/10 border-[#006D52]/20"
    : report.tier === "fair" ? "text-amber-900 bg-amber-50 border-amber-200"
    : "text-red-800 bg-red-50 border-red-200";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tierClass}`}>
      <p className="text-sm font-semibold">{t("studio.director.movie.title")}</p>
      <p className="mt-1 text-xs opacity-90">
        {t(`studio.director.movie.tier.${report.tier}` as TranslationKey)} ·{" "}
        {t("studio.aiDirector.directorQuality", { score: report.directorQualityScore })} ·{" "}
        {t("studio.director.diversityScore", { score: report.shotDiversityScore })} ·{" "}
        {t("studio.intelligence.healthScore", { score: report.storyHealthScore })}
        {production.voiceEnabled ?
          <> · {t("studio.voice.score", { score: production.voiceScore })}</>
        : null}
        {" "}
        · {t("studio.production.readinessScore", { score: production.readinessScore })}
        {" "}
        · {t("studio.production.overallScore", { score: production.overallProductionScore })}
      </p>
      {report.recommendationKeys.length > 0 ?
        <ul className="mt-2 list-inside list-disc text-xs">
          {report.recommendationKeys.slice(0, 4).map((key) => (
            <li key={key}>{t(key as TranslationKey)}</li>
          ))}
        </ul>
      : null}
    </div>
  );
}
