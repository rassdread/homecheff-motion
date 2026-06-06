"use client";

import { useMemo } from "react";
import { StudioSourceBadge } from "@/components/studio/studio-source-badge";
import { buildStudioAudioConfidence } from "@/lib/build-studio-audio-confidence";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  characters: StudioCharacterListItem[];
};

export function StudioAudioConfidenceCard({ storyboard, scene, characters }: Props) {
  const t = useActiveTranslator();
  const audio = useMemo(
    () => buildStudioAudioConfidence(storyboard, scene, characters),
    [storyboard, scene, characters]
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          {t("studio.audioConfidence.title")}
        </p>
        <StudioSourceBadge kind="studio_source" />
      </div>
      <p className="mb-3 text-[11px] text-zinc-600">{t("studio.audioConfidence.hint")}</p>
      <dl className="space-y-3 text-xs">
        <div>
          <dt className="font-semibold text-zinc-800">{t("studio.audioConfidence.voice")}</dt>
          <dd className="mt-1 text-zinc-700">
            {audio.voice.enabled
              ? audio.voice.lockedCount > 0
                ? t("studio.audioConfidence.voiceLocked", {
                    count: String(audio.voice.lockedCount),
                    names: audio.voice.lockedNames.join(", "),
                  })
                : audio.voice.summary
              : t("studio.audioConfidence.voiceOff")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-800">{t("studio.audioConfidence.music")}</dt>
          <dd className="mt-1 text-zinc-700">
            {audio.music.enabled
              ? audio.music.sceneCue
                ? t("studio.audioConfidence.musicScene", { mood: audio.music.mood })
                : audio.music.mood
              : t("studio.audioConfidence.musicOff")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-800">{t("studio.audioConfidence.sound")}</dt>
          <dd className="mt-1 text-zinc-700">
            {audio.sound.enabled
              ? audio.sound.environment ?? t("studio.audioConfidence.soundDefault")
              : t("studio.audioConfidence.soundOff")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
