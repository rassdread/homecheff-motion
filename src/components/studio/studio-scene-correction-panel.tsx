"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { SceneCorrectionPreviewResponse } from "@/types/studio-correction";
import type { ImprovementScore } from "@/types/studio-correction";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type StudioSceneCorrectionPanelProps = {
  preview: SceneCorrectionPreviewResponse | null;
  loading: boolean;
  image: StudioSceneImageListItem | null;
  improvement?: ImprovementScore | null;
};

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-900 bg-red-100";
    case "high":
      return "text-orange-900 bg-orange-100";
    case "medium":
      return "text-amber-900 bg-amber-50";
    case "low":
    default:
      return "text-zinc-700 bg-zinc-100";
  }
}

export function StudioSceneCorrectionPanel({
  preview,
  loading,
  image,
  improvement,
}: StudioSceneCorrectionPanelProps) {
  const t = useActiveTranslator();

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("studio.correction.loading")}</p>;
  }

  if (!image || image.status !== "completed") {
    return (
      <p className="text-sm text-zinc-500">{t("studio.correction.noCompletedImage")}</p>
    );
  }

  if (!preview) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.correction.noPreviewYet")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {improvement && improvement.previousScore !== null ? (
        <AppCard className="border-[#006D52]/30 bg-[#006D52]/5 p-4">
          <p className="text-sm font-semibold text-[#006D52]">
            {t("studio.correction.improvementTitle")}
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-900">
            {improvement.previousScore} → {improvement.newScore}
            <span className={improvement.improved ? " text-emerald-700" : " text-zinc-600"}>
              {" "}
              ({improvement.delta > 0 ? "+" : ""}
              {improvement.delta})
            </span>
          </p>
        </AppCard>
      ) : image.improvementScore !== null && image.previousConsistencyScore !== null ? (
        <AppCard className="border-[#006D52]/30 bg-[#006D52]/5 p-4">
          <p className="text-sm font-semibold text-[#006D52]">
            {t("studio.correction.improvementTitle")}
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-900">
            {image.previousConsistencyScore} → {image.consistencyScore ?? "—"}
            <span className={image.improvementScore > 0 ? " text-emerald-700" : " text-zinc-600"}>
              {" "}
              ({image.improvementScore > 0 ? "+" : ""}
              {image.improvementScore})
            </span>
          </p>
        </AppCard>
      ) : null}

      {preview.recommendations.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.correction.recommendations")}
          </p>
          <ul className="mt-2 space-y-2">
            {preview.recommendations.map((rec) => (
              <li
                key={rec.id}
                className="rounded-xl border border-zinc-200 bg-white p-3 text-sm"
              >
                <span
                  className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${severityClass(rec.severity)}`}
                >
                  {t(`studio.correction.severity.${rec.severity}`)}
                </span>
                <span className="font-medium text-zinc-900">{rec.message}</span>
                <p className="mt-1 text-xs text-zinc-600">{rec.promptPatch}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{t("studio.correction.noRecommendations")}</p>
      )}

      {preview.patches.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.correction.promptPatches")}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {preview.patches.map((patch) => (
              <li key={patch.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                <span className="text-xs font-semibold text-zinc-500">
                  {patch.type} · p{patch.priority}
                </span>
                <p>{patch.text}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          {t("studio.correction.correctedPromptPreview")}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{preview.correctedPrompt}</p>
      </div>
    </div>
  );
}
