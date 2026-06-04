"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StoryboardCorrectionSummary } from "@/types/studio-correction";

type StudioStoryboardCorrectionPanelProps = {
  summary: StoryboardCorrectionSummary | null;
  loading?: boolean;
};

function actionClass(action: string): string {
  switch (action) {
    case "regenerate":
      return "text-red-800 bg-red-50";
    case "review":
      return "text-amber-900 bg-amber-50";
    default:
      return "text-emerald-800 bg-emerald-50";
  }
}

export function StudioStoryboardCorrectionPanel({
  summary,
  loading,
}: StudioStoryboardCorrectionPanelProps) {
  const t = useActiveTranslator();

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("studio.correction.loading")}</p>;
  }

  if (!summary) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.correction.storyboardHint")}</p>
    );
  }

  const needing = summary.scenes.filter((s) => s.action !== "ok");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold text-zinc-900">
          {t("studio.correction.summaryTitle")}
        </p>
        <dl className="mt-2 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-zinc-500">{t("studio.correction.summary.scenes")}</dt>
            <dd>{summary.scenesNeedingCorrection}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-500">
              {t("studio.correction.summary.recommendations")}
            </dt>
            <dd>{summary.totalRecommendations}</dd>
          </div>
        </dl>
      </div>

      {needing.length > 0 ? (
        <ul className="space-y-2">
          {needing.map((scene) => (
            <li
              key={scene.sceneId}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-zinc-900">
                {t("studio.correction.sceneLine", {
                  order: String(scene.order + 1),
                  title: scene.sceneTitle || t("studio.correction.unnamedScene"),
                })}
              </span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${actionClass(scene.action)}`}
              >
                {t(`studio.correction.action.${scene.action}`)}
              </span>
              <p className="mt-1 text-xs text-zinc-600">{scene.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-emerald-800">{t("studio.correction.allScenesOk")}</p>
      )}
    </div>
  );
}
