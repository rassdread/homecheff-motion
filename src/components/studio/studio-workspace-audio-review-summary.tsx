"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useStudioAudioChangePlan } from "@/hooks/use-studio-audio-change-plan";
import {
  listPendingStudioAudioChangePlanItems,
  listStudioAudioProjectAssetsByKind,
} from "@/lib/studio-audio-change-plan";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  storyboardId: string;
};

export function StudioWorkspaceAudioReviewSummary({
  storyboard,
  characters,
  storyboardId,
}: Props) {
  const t = useActiveTranslator();
  const { changePlan, audioProjectAssets } = useStudioAudioChangePlan(storyboardId);

  const pending = useMemo(
    () => listPendingStudioAudioChangePlanItems(changePlan),
    [changePlan]
  );
  const applied = useMemo(
    () => changePlan.items.filter((item) => item.status === "done"),
    [changePlan.items]
  );
  const voiceAssets = listStudioAudioProjectAssetsByKind(audioProjectAssets, "voice");
  const musicAssets = listStudioAudioProjectAssetsByKind(audioProjectAssets, "music");
  const sfxAssets = listStudioAudioProjectAssetsByKind(audioProjectAssets, "sound_effect");

  const characterVoices = characters.filter((c) => c.voiceEnabled);

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3"
      data-testid="studio-audio-review-summary"
    >
      <h3 className="text-xs font-semibold text-zinc-900">
        {t("studio.v9.review.title" as never)}
      </h3>

      <div className="mt-2 space-y-2 text-xs text-zinc-700">
        <div>
          <p className="font-semibold text-zinc-800">{t("studio.v9.review.voice" as never)}</p>
          <ul className="mt-1 space-y-0.5 pl-2">
            <li>
              {t("studio.v9.review.projectVoice" as never)}:{" "}
              {storyboard.voiceEnabled ? storyboard.voiceProfile ?? "—" : "—"}
            </li>
            <li>
              {t("studio.v9.review.characterVoices" as never)}: {characterVoices.length}
            </li>
            <li>
              {t("studio.v9.review.sceneVoices" as never)}: {voiceAssets.filter((a) => a.sceneId).length}
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-zinc-800">{t("studio.v9.review.music" as never)}</p>
          <p className="mt-0.5 pl-2">
            {musicAssets[0]?.prompt ?? storyboard.audioAssetLinks?.musicAssetId ?? "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-zinc-800">{t("studio.v9.review.sfx" as never)}</p>
          <p className="mt-0.5 pl-2">
            {sfxAssets.length > 0
              ? `${sfxAssets.length} ${t("studio.v9.review.sfxScenes" as never)}`
              : "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-zinc-800">{t("studio.v9.review.changePlan" as never)}</p>
          <p className="mt-0.5 pl-2">
            {pending.length} {t("studio.v9.review.pending" as never)} · {applied.length}{" "}
            {t("studio.v9.review.applied" as never)}
          </p>
        </div>
      </div>
    </section>
  );
}
