"use client";

import { analyzeStoryFlow, type StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
};

function toFlowInput(storyboard: StudioStoryboardDetail): StoryFlowSceneInput[] {
  return storyboard.scenes.map((scene) => ({
    sceneId: scene.id,
    order: scene.order,
    title: scene.title,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    camera: scene.camera,
  }));
}

export function StudioDirectorTimeline({ storyboard }: Props) {
  const t = useActiveTranslator();
  const analysis = analyzeStoryFlow(toFlowInput(storyboard));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.director.timeline.title")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{t("studio.director.timeline.hint")}</p>
        </div>
        <div className="rounded-full bg-[#006D52]/10 px-3 py-1 text-xs font-semibold text-[#006D52]">
          {t("studio.director.diversityScore", { score: analysis.shotDiversityScore })}
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {analysis.timeline.map((entry) => (
          <li
            key={entry.sceneId}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
          >
            <span className="font-semibold text-zinc-800">
              {t("studio.director.timeline.scene", { index: entry.order + 1 })}
            </span>
            <span className="text-zinc-400">—</span>
            <span className="font-medium text-[#006D52]">
              {t(entry.shotLabelKey as TranslationKey)}
            </span>
            {entry.movementValue ?
              <span className="text-xs text-zinc-500">
                · {t(entry.movementLabelKey as TranslationKey)}
              </span>
            : null}
          </li>
        ))}
      </ol>

      {analysis.warnings.length > 0 ?
        <ul className="mt-4 space-y-2">
          {analysis.warnings.map((warning) => (
            <li
              key={`${warning.code}-${warning.sceneIds.join("-")}`}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              {t(warning.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
      : null}
    </div>
  );
}
