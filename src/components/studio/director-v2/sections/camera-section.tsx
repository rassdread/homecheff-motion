"use client";

import { useMemo } from "react";
import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { StudioDirectorInfoButton } from "@/components/studio/director-v2/studio-director-info-button";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import {
  legacyCameraFromShotType,
  STUDIO_CAMERA_MOVEMENTS,
  STUDIO_SHOT_TYPES,
} from "@/lib/studio-scene-director";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioSceneDetail } from "@/types/studio-api";

const SHOT_CARD_IDS = ["close_up", "medium", "wide", "extreme_wide"] as const;
const MOTION_CARD_IDS = ["static", "push_in", "tracking", "follow"] as const;
const FOCUS_CARD_IDS = ["character", "product", "environment", "mixed"] as const;

type Props = {
  scene: StudioSceneDetail;
  canModify: boolean;
  onPatch: (patch: Partial<Pick<StudioSceneDetail, "shotType" | "cameraMovement" | "camera">>) => void;
};

export function StudioDirectorSectionCamera({ scene, canModify, onPatch }: Props) {
  const t = useActiveTranslator();
  const composition = useMemo(() => buildSceneCompositionForScene(scene), [scene]);

  const focusKind =
    composition.visualFocus.kind === "character"
      ? "character"
      : composition.visualFocus.kind === "product" || composition.visualFocus.kind === "brand"
        ? "product"
        : composition.visualFocus.kind === "location"
          ? "environment"
          : "mixed";

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.directorV2.camera.shotType")}
          </p>
          <StudioDirectorInfoButton infoKey="studio.directorV2.info.camera.shotType" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHOT_CARD_IDS.map((id) => (
            <StudioDirectorCardSelect
              key={id}
              label={t(`studio.directorV2.camera.shot.${id}` as TranslationKey)}
              selected={scene.shotType === id || (id === "medium" && scene.shotType === "medium_wide")}
              disabled={!canModify}
              onSelect={() =>
                onPatch({
                  shotType: id,
                  camera: legacyCameraFromShotType(id) ?? scene.camera,
                })
              }
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.directorV2.camera.motion")}
          </p>
          <StudioDirectorInfoButton infoKey="studio.directorV2.info.camera.motion" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MOTION_CARD_IDS.map((id) => (
            <StudioDirectorCardSelect
              key={id}
              label={t(`studio.directorV2.camera.motionCard.${id}` as TranslationKey)}
              selected={scene.cameraMovement === id}
              disabled={!canModify}
              onSelect={() => onPatch({ cameraMovement: id })}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">
          {t("studio.directorV2.camera.motionAdvanced")}:{" "}
          {STUDIO_CAMERA_MOVEMENTS.filter((m) => !MOTION_CARD_IDS.includes(m as typeof MOTION_CARD_IDS[number]))
            .slice(0, 4)
            .join(", ")}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.directorV2.camera.focus")}
          </p>
          <StudioDirectorInfoButton infoKey="studio.directorV2.info.camera.focus" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FOCUS_CARD_IDS.map((id) => (
            <StudioDirectorCardSelect
              key={id}
              label={t(`studio.directorV2.camera.focusCard.${id}` as TranslationKey)}
              selected={focusKind === id}
              disabled
              onSelect={() => undefined}
            />
          ))}
        </div>
        <p className="mt-1 text-[10px] text-zinc-500">{t("studio.directorV2.camera.focusReadOnly")}</p>
      </div>

      <p className="text-[10px] text-zinc-400">
        {t("studio.directorV2.camera.allShots")}: {STUDIO_SHOT_TYPES.slice(0, 6).join(", ")}…
      </p>
    </div>
  );
}
