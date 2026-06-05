"use client";

import { useMemo } from "react";
import { detectArcPhaseForIndex } from "@/lib/studio-story-arc";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import { studioScenePresetLabel } from "@/lib/studio-scene-preset-label";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  saving: boolean;
};

export function StudioDirectorInspectorColumn({
  scene,
  sceneIndex,
  sceneCount,
  saving,
}: Props) {
  const t = useActiveTranslator();
  const arcPhase = detectArcPhaseForIndex(sceneIndex, sceneCount);
  const composition = useMemo(() => buildSceneCompositionForScene(scene), [scene]);

  return (
    <aside className="space-y-3 rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
        {t("studio.directorV2.inspector.title")}
      </p>
      <dl className="space-y-2 text-xs">
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.directorV2.inspector.arc")}</dt>
          <dd className="mt-0.5 text-zinc-800">
            {t(`studio.intelligence.arc.${arcPhase}` as TranslationKey)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.directorV2.inspector.focus")}</dt>
          <dd className="mt-0.5 text-zinc-800">
            {composition.visualFocus.entityName ??
              t(composition.visualFocus.labelKey as TranslationKey)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.storyboards.preview.emotion")}</dt>
          <dd className="mt-0.5 text-zinc-800">
            {studioScenePresetLabel(t, "emotion", scene.emotion) || "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.storyboards.preview.shotType")}</dt>
          <dd className="mt-0.5 text-zinc-800">
            {studioScenePresetLabel(t, "shot", scene.shotType) ||
              studioScenePresetLabel(t, "camera", scene.camera) ||
              "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.directorV2.inspector.duration")}</dt>
          <dd className="mt-0.5 text-zinc-800">{scene.durationSeconds}s</dd>
        </div>
      </dl>
      <p className="text-[10px] text-zinc-500">
        {saving ? t("button.loading") : t("studio.directorV2.inspector.hint")}
      </p>
    </aside>
  );
}
