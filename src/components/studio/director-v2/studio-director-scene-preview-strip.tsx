"use client";

import { useMemo } from "react";
import { buildStudioTextBeats, studioSceneDetailToBeatSource } from "@/lib/build-studio-text-beats";
import { buildDirectorScenePreviewText } from "@/lib/studio-scene-director-preview";
import { studioScenePresetLabel } from "@/lib/studio-scene-preset-label";
import { syncLegacyFieldFromBeats } from "@/lib/story-text-beats";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  directorProfile: StudioDirectorProfile;
  storyboardTitle: string;
  storyboardDescription: string;
  aiDirectorNotes: string;
};

function resolveSceneStillUrl(scene: StudioSceneDetail): string | null {
  const selected = scene.selectedSceneImageId
    ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
    : scene.sceneImages.find((img) => img.status === "completed");
  const url = selected?.thumbnailUrl?.trim() || selected?.imageUrl?.trim();
  return url || null;
}

export function StudioDirectorScenePreviewStrip({
  scene,
  sceneIndex,
  sceneCount,
  directorProfile,
  storyboardTitle,
  storyboardDescription,
  aiDirectorNotes,
}: Props) {
  const t = useActiveTranslator();
  const stillUrl = resolveSceneStillUrl(scene);
  const motionLine = buildDirectorScenePreviewText(scene, directorProfile);
  const emotionLabel = studioScenePresetLabel(t, "emotion", scene.emotion);
  const shotLabel =
    studioScenePresetLabel(t, "shot", scene.shotType) ||
    studioScenePresetLabel(t, "camera", scene.camera);
  const movementLabel = studioScenePresetLabel(t, "movement", scene.cameraMovement);

  const textPreview = useMemo(() => {
    const built = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(scene),
      sceneIndex,
      sceneCount,
      storyboardTitle,
      storyboardDescription,
      aiDirectorNotes,
    });
    const headline =
      syncLegacyFieldFromBeats(built.headlineBeats) ||
      syncLegacyFieldFromBeats(built.titleBeats);
    const subheadline = syncLegacyFieldFromBeats(built.subtitleBeats);
    return { headline, subheadline };
  }, [scene, sceneIndex, sceneCount, storyboardTitle, storyboardDescription, aiDirectorNotes]);

  const characterNames = scene.characters.map((c) => c.name).join(", ");

  return (
    <div className="sticky top-0 z-10 rounded-2xl border border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/8 to-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#006D52]">
        {t("studio.directorV2.preview.title")}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 sm:h-24 sm:w-40">
          {stillUrl ?
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stillUrl} alt="" className="h-full w-full object-cover" />
          : <span className="px-3 text-center text-xs text-zinc-500">
              {t("studio.directorV2.preview.noStill")}
            </span>
          }
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <p className="font-medium text-zinc-900">
            {[emotionLabel, shotLabel, movementLabel].filter(Boolean).join(" · ") || "—"}
          </p>
          {motionLine ?
            <p className="line-clamp-2 text-zinc-700">{motionLine}</p>
          : null}
          {textPreview.headline || textPreview.subheadline ?
            <p className="text-xs text-zinc-600">
              {textPreview.headline ?
                <span className="font-semibold">{textPreview.headline}</span>
              : null}
              {textPreview.headline && textPreview.subheadline ? " / " : null}
              {textPreview.subheadline}
            </p>
          : null}
          {characterNames ?
            <p className="text-xs text-zinc-500">
              {t("studio.directorV2.preview.voice")}: {characterNames}
            </p>
          : null}
        </div>
      </div>
    </div>
  );
}
