"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";

type Props = {
  plan: StudioStoryPlan;
};

export function StudioBuildStoryPanel({ plan }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4" data-testid="studio-build-story-panel">
      <section className="rounded-xl border border-sky-200 bg-sky-50/80 p-4">
        <h3 className="text-sm font-semibold text-sky-950">{t("studio.buildStory.logline" as never)}</h3>
        <p className="mt-1 text-sm text-sky-900">{plan.logline}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.buildStory.structure" as never)}</h3>
        <p className="mt-1 text-sm text-zinc-600">{plan.storyStructure}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.buildStory.scenes" as never)}</h3>
        <ul className="mt-2 space-y-2">
          {plan.scenes.map((scene) => (
            <li key={scene.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
              <p className="font-semibold text-zinc-900">
                {t("studio.buildStory.sceneLabel" as never, { index: scene.index } as never)}: {scene.title}
              </p>
              <p className="mt-1 text-zinc-600">{scene.description}</p>
              {scene.voiceOver ?
                <p className="mt-1 text-xs italic text-zinc-500">VO: {scene.voiceOver}</p>
              : null}
            </li>
          ))}
        </ul>
      </section>
      {plan.assetRequirements.length > 0 ?
        <section>
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.buildStory.assets" as never)}</h3>
          <p className="mt-1 text-xs text-zinc-600">{plan.assetRequirements.join(" · ")}</p>
        </section>
      : null}
    </div>
  );
}
