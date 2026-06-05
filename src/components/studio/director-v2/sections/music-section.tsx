"use client";

import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { useActiveTranslator } from "@/i18n/client";
import {
  MUSIC_CUE_TYPES,
  MUSIC_ENERGY_TARGETS,
  type MusicCueType,
  type MusicEnergyTarget,
} from "@/types/studio-music-director";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  canModify: boolean;
  onPatch: (patch: Partial<StudioSceneDetail>) => void;
};

export function StudioDirectorSectionMusic({ scene, canModify, onPatch }: Props) {
  const t = useActiveTranslator();
  const cue = (scene.musicCueType || "") as MusicCueType | "";
  const energy = (scene.musicEnergyTarget || "") as MusicEnergyTarget | "";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.music.cue")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MUSIC_CUE_TYPES.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value.replace(/_/g, " ")}
              selected={cue === value}
              disabled={!canModify}
              onSelect={() => onPatch({ musicCueType: value })}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.music.energy")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MUSIC_ENERGY_TARGETS.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value}
              selected={energy === value}
              disabled={!canModify}
              onSelect={() => onPatch({ musicEnergyTarget: value })}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t("studio.directorV2.music.previewHint")}</p>
    </div>
  );
}
