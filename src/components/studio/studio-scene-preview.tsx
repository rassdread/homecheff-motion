"use client";

import { buildDirectorScenePreviewText } from "@/lib/studio-scene-director-preview";
import { studioScenePresetLabel } from "@/lib/studio-scene-preset-label";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioSceneDetail } from "@/types/studio-api";

type StudioScenePreviewProps = {
  scene: StudioSceneDetail;
  directorProfile?: StudioDirectorProfile;
};

export function StudioScenePreview({ scene, directorProfile }: StudioScenePreviewProps) {
  const t = useActiveTranslator();
  const directorLine = buildDirectorScenePreviewText(scene, directorProfile);

  const rows: Array<{ label: string; value: string }> = [
    {
      label: t("studio.storyboards.preview.location"),
      value: scene.location?.name ?? "—",
    },
    {
      label: t("studio.storyboards.preview.characters"),
      value: scene.characters.map((c) => c.name).join(", ") || "—",
    },
    {
      label: t("studio.storyboards.preview.props"),
      value: scene.props.map((p) => p.name).join(", ") || "—",
    },
    {
      label: t("studio.storyboards.preview.action"),
      value: studioScenePresetLabel(t, "action", scene.action),
    },
    {
      label: t("studio.storyboards.preview.emotion"),
      value: studioScenePresetLabel(t, "emotion", scene.emotion),
    },
    {
      label: t("studio.storyboards.preview.shotType"),
      value: studioScenePresetLabel(t, "shot", scene.shotType) || studioScenePresetLabel(t, "camera", scene.camera),
    },
    {
      label: t("studio.storyboards.preview.cameraMovement"),
      value: studioScenePresetLabel(t, "movement", scene.cameraMovement),
    },
    {
      label: t("studio.storyboards.preview.sceneEnergy"),
      value: studioScenePresetLabel(t, "energy", scene.sceneEnergy),
    },
  ];

  return (
    <div className="rounded-2xl border border-[#006D52]/20 bg-[#006D52]/5 p-4 text-sm">
      <p className="font-semibold text-[#006D52]">{t("studio.storyboards.preview.title")}</p>
      {directorLine ?
        <p className="mt-2 text-sm leading-relaxed text-zinc-800">{directorLine}</p>
      : null}
      <dl className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{row.label}</dt>
            <dd className="mt-0.5 text-zinc-800">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
