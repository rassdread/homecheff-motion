"use client";

import { useMemo } from "react";
import { buildStudioTextBeats, studioSceneDetailToBeatSource } from "@/lib/build-studio-text-beats";
import { syncLegacyFieldFromBeats } from "@/lib/story-text-beats";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  storyboardTitle: string;
  storyboardDescription: string;
  aiDirectorNotes: string;
};

function BeatList({ label, beats }: { label: string; beats: string[] }) {
  if (beats.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <ul className="mt-1 space-y-1 text-sm text-zinc-800">
        {beats.map((beat) => (
          <li key={beat} className="rounded-lg bg-zinc-50 px-2 py-1">
            {beat}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudioDirectorSectionText({
  scene,
  sceneIndex,
  sceneCount,
  storyboardTitle,
  storyboardDescription,
  aiDirectorNotes,
}: Props) {
  const t = useActiveTranslator();

  const built = useMemo(
    () =>
      buildStudioTextBeats({
        scene: studioSceneDetailToBeatSource(scene),
        sceneIndex,
        sceneCount,
        storyboardTitle,
        storyboardDescription,
        aiDirectorNotes,
      }),
    [scene, sceneIndex, sceneCount, storyboardTitle, storyboardDescription, aiDirectorNotes]
  );

  const headline = syncLegacyFieldFromBeats(built.headlineBeats);
  const subheadline = syncLegacyFieldFromBeats(built.subtitleBeats);
  const hero = syncLegacyFieldFromBeats(built.heroTextBeats) || built.heroText;
  const finale = syncLegacyFieldFromBeats(built.finaleTextBeats) || built.heroFinaleText;

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">{t("studio.directorV2.text.hint")}</p>
      {headline ? (
        <div className="rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-[#006D52]">
            {t("studio.directorV2.text.headline")}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">{headline}</p>
        </div>
      ) : null}
      {subheadline ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            {t("studio.directorV2.text.subheadline")}
          </p>
          <p className="mt-1 text-sm text-zinc-800">{subheadline}</p>
        </div>
      ) : null}
      <BeatList label={t("studio.directorV2.text.hero")} beats={built.heroTextBeats} />
      <BeatList label={t("studio.directorV2.text.beatLines")} beats={built.beatLines} />
      <BeatList label={t("studio.directorV2.text.finale")} beats={built.finaleTextBeats} />
      {hero && !built.heroTextBeats.length ? (
        <p className="text-sm text-zinc-700">{hero}</p>
      ) : null}
      {finale && !built.finaleTextBeats.length ? (
        <p className="text-sm text-zinc-700">{finale}</p>
      ) : null}
    </div>
  );
}
