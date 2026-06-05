"use client";

import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { StudioDirectorInfoButton } from "@/components/studio/director-v2/studio-director-info-button";
import {
  sceneEnergyFromSlider,
  sliderFromSceneEnergy,
} from "@/lib/studio-director-v2-story-purpose";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioSceneDetail } from "@/types/studio-api";

const EMOTION_CARD_IDS = [
  "happy",
  "calm",
  "excited",
  "dramatic",
  "community",
  "curious",
] as const;

const EMOTION_CARD_TO_PRESET: Record<(typeof EMOTION_CARD_IDS)[number], string> = {
  happy: "happy",
  calm: "serious",
  excited: "excited",
  dramatic: "serious",
  community: "celebrating",
  curious: "curious",
};

type Props = {
  scene: StudioSceneDetail;
  canModify: boolean;
  onPatch: (patch: Partial<Pick<StudioSceneDetail, "emotion" | "sceneEnergy">>) => void;
};

export function StudioDirectorSectionEmotion({ scene, canModify, onPatch }: Props) {
  const t = useActiveTranslator();
  const energyLevel = sliderFromSceneEnergy(scene.sceneEnergy);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.directorV2.emotion.cards")}
          </p>
          <StudioDirectorInfoButton infoKey="studio.directorV2.info.emotion" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EMOTION_CARD_IDS.map((id) => {
            const preset = EMOTION_CARD_TO_PRESET[id];
            const selected = scene.emotion === preset;
            return (
              <StudioDirectorCardSelect
                key={id}
                label={t(`studio.directorV2.emotion.card.${id}` as TranslationKey)}
                selected={selected}
                disabled={!canModify}
                onSelect={() => onPatch({ emotion: preset })}
              />
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-800">{t("studio.directorV2.emotion.energy")}</p>
            <StudioDirectorInfoButton infoKey="studio.directorV2.info.emotion.energy" />
          </div>
          <span className="text-xs font-semibold text-[#006D52]">
            {t(`studio.directorV2.emotion.energyLevel.${energyLevel}` as TranslationKey)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          disabled={!canModify}
          value={energyLevel}
          onChange={(e) =>
            onPatch({
              sceneEnergy: sceneEnergyFromSlider(Number(e.target.value) as 0 | 1 | 2),
            })
          }
          className="w-full accent-[#006D52]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
          <span>{t("studio.directorV2.emotion.energyLevel.0")}</span>
          <span>{t("studio.directorV2.emotion.energyLevel.1")}</span>
          <span>{t("studio.directorV2.emotion.energyLevel.2")}</span>
        </div>
      </div>
    </div>
  );
}
