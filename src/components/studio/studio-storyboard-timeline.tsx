"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

type StudioStoryboardTimelineProps = {
  scenes: StudioSceneDetail[];
};

export function StudioStoryboardTimeline({ scenes }: StudioStoryboardTimelineProps) {
  const t = useActiveTranslator();

  if (scenes.length === 0) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.storyboards.timelineEmpty")}</p>
    );
  }

  return (
    <ol className="space-y-0">
      {scenes.map((scene, index) => {
        const line =
          scene.description.trim() ||
          scene.title ||
          t("studio.storyboards.sceneUntitled");
        return (
          <li key={scene.id} className="flex flex-col items-center">
            <div className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase text-[#0067B1]">
                {t("studio.storyboards.sceneLabel", { number: String(index + 1) })}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{scene.title || line}</p>
              {scene.title && scene.description ? (
                <p className="mt-1 text-xs text-zinc-600">{scene.description}</p>
              ) : null}
            </div>
            {index < scenes.length - 1 ? (
              <span className="my-2 text-lg text-zinc-400" aria-hidden>
                ↓
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
