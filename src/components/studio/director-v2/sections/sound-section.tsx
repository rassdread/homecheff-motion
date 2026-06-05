"use client";

import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { useActiveTranslator } from "@/i18n/client";
import { SOUND_ENVIRONMENT_IDS } from "@/types/studio-sound-director";
import type { StudioSceneDetail } from "@/types/studio-api";

const SUGGESTED_SFX = ["whoosh", "impact_soft", "page_turn", "kitchen_ambience"] as const;

type Props = {
  scene: StudioSceneDetail;
  canModify: boolean;
  onPatch: (patch: Partial<StudioSceneDetail>) => void;
};

export function StudioDirectorSectionSound({ scene, canModify, onPatch }: Props) {
  const t = useActiveTranslator();
  const environment = scene.soundEnvironmentOverride?.trim() || "";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.sound.environment")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOUND_ENVIRONMENT_IDS.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value.replace(/_/g, " ")}
              selected={environment === value}
              disabled={!canModify}
              onSelect={() => onPatch({ soundEnvironmentOverride: value })}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.sound.suggested")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_SFX.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value.replace(/_/g, " ")}
              selected={scene.soundPropOverride?.includes(value) ?? false}
              disabled={!canModify}
              onSelect={() => onPatch({ soundPropOverride: value })}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t("studio.directorV2.sound.previewHint")}</p>
    </div>
  );
}
