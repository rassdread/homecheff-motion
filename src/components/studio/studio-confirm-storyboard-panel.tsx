"use client";

import { useActiveTranslator } from "@/i18n/client";
import { regenerateStoryPlanScene, removeStoryPlanScene } from "@/lib/studio-build-story-plan";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefSelections, StudioStoryPlan } from "@/types/studio-production-brief-v3";
import { BriefSelectionCards } from "@/components/studio/brief-selection-cards";

type Props = {
  brief: StudioProductionBrief;
  selections: StudioProductionBriefSelections;
  storyPlan: StudioStoryPlan;
  onStoryPlanChange: (plan: StudioStoryPlan) => void;
  onRegenerateAll?: () => void;
};

export function StudioConfirmStoryboardPanel({
  brief,
  selections,
  storyPlan,
  onStoryPlanChange,
  onRegenerateAll,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-6" data-testid="studio-confirm-storyboard-panel">
      <section>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.confirm.userInput" as never)}</h3>
        <p className="mt-1 text-sm text-zinc-600">{brief.idea}</p>
        <div className="mt-3 pointer-events-none opacity-80">
          <BriefSelectionCards selections={selections} onChange={() => {}} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.confirm.summary" as never)}</h3>
        <p className="mt-1 text-sm text-zinc-700">{storyPlan.logline}</p>
        <p className="mt-1 text-xs text-zinc-500">{brief.goal}</p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.confirm.storyboard" as never)}</h3>
          {onRegenerateAll ?
            <button type="button" onClick={onRegenerateAll} className="text-xs font-semibold text-[#006D52] hover:underline">
              {t("studio.confirm.regenerateAll" as never)}
            </button>
          : null}
        </div>
        <ul className="mt-3 space-y-3">
          {storyPlan.scenes.map((scene) => (
            <li key={scene.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-bold text-zinc-900">
                {t("studio.buildStory.sceneLabel" as never, { index: scene.index } as never)}: {scene.title}
              </p>
              <dl className="mt-2 grid gap-1 text-xs text-zinc-600">
                <div><dt className="inline font-semibold">{t("studio.confirm.scene.purpose" as never)}: </dt><dd className="inline">{scene.purpose}</dd></div>
                <div><dt className="inline font-semibold">{t("studio.confirm.scene.description" as never)}: </dt><dd className="inline">{scene.description}</dd></div>
                {scene.dialogue ?
                  <div><dt className="inline font-semibold">{t("studio.confirm.scene.dialogue" as never)}: </dt><dd className="inline">{scene.dialogue}</dd></div>
                : null}
                {scene.voiceOver ?
                  <div><dt className="inline font-semibold">{t("studio.confirm.scene.voice" as never)}: </dt><dd className="inline">{scene.voiceOver}</dd></div>
                : null}
                <div><dt className="inline font-semibold">{t("studio.confirm.scene.location" as never)}: </dt><dd className="inline">{scene.location}</dd></div>
                {scene.requiredAssets.length > 0 ?
                  <div><dt className="inline font-semibold">{t("studio.confirm.scene.assets" as never)}: </dt><dd className="inline">{scene.requiredAssets.join(", ")}</dd></div>
                : null}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border px-2 py-1 text-[10px] font-semibold"
                  onClick={() => onStoryPlanChange(regenerateStoryPlanScene(storyPlan, scene.id, "commercial"))}
                >
                  {t("studio.confirm.scene.regenerate" as never)}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700"
                  onClick={() => onStoryPlanChange(removeStoryPlanScene(storyPlan, scene.id))}
                >
                  {t("studio.confirm.scene.remove" as never)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
