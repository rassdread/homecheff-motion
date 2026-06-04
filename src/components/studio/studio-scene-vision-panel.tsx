"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type StudioSceneVisionPanelProps = {
  image: StudioSceneImageListItem | null;
  report: VisionConsistencyReport | null;
};

function statusColor(status: string | null | undefined): string {
  switch (status) {
    case "excellent":
      return "text-emerald-700 bg-emerald-50";
    case "good":
      return "text-[#006D52] bg-[#006D52]/10";
    case "needs_review":
      return "text-amber-800 bg-amber-50";
    case "poor":
      return "text-red-800 bg-red-50";
    default:
      return "text-zinc-600 bg-zinc-100";
  }
}

export function StudioSceneVisionPanel({ image, report }: StudioSceneVisionPanelProps) {
  const t = useActiveTranslator();

  if (!image || image.status !== "completed") {
    return (
      <p className="text-sm text-zinc-500">{t("studio.vision.noCompletedImage")}</p>
    );
  }

  if (!report) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.vision.notAnalyzedYet")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColor(report.visionStatus)}`}
        >
          {t(`studio.consistency.status.${report.visionStatus}`)} · {report.overallVisionScore}
        </span>
        <span className="text-xs text-zinc-500">
          {t("studio.vision.provider")}: {report.providerId} ({report.analysisMethod})
        </span>
        {report.referenceComparisonUsed ? (
          <span className="text-xs font-semibold text-[#0067B1]">
            {t("studio.vision.referenceCompared")}
          </span>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{t("studio.vision.score.character")}</dt>
          <dd className="text-lg font-bold text-zinc-900">{report.characterVisionScore}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{t("studio.vision.score.location")}</dt>
          <dd className="text-lg font-bold text-zinc-900">{report.locationVisionScore}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{t("studio.vision.score.prop")}</dt>
          <dd className="text-lg font-bold text-zinc-900">{report.propVisionScore}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{t("studio.vision.score.branding")}</dt>
          <dd className="text-lg font-bold text-zinc-900">{report.brandingVisionScore}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{t("studio.vision.score.world")}</dt>
          <dd className="text-lg font-bold text-zinc-900">{report.worldVisionScore}</dd>
        </div>
      </dl>

      {report.detectedElements.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.vision.detectedElements")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.detectedElements.map((el) => (
              <li
                key={el}
                className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700"
              >
                {el}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.visionWarnings.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.vision.warnings")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {report.visionWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.visionRecommendations.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.vision.recommendations")}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {report.visionRecommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-zinc-500">{t("studio.vision.methodHint")}</p>
    </div>
  );
}
