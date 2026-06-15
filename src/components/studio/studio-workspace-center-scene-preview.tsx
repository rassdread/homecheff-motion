"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
};

export function StudioWorkspaceCenterScenePreview({ scene, sceneIndex, sceneCount }: Props) {
  const t = useActiveTranslator();
  const previewImage =
    scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
    scene.sceneImages[0] ??
    null;

  return (
    <section
      className="mb-4 rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4"
      data-testid="studio-center-scene-preview"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("studio.v9.center.activeScene" as never)}
      </p>
      <h2 className="mt-1 text-base font-semibold text-zinc-900">
        {scene.title?.trim() || t("studio.v9.center.untitledScene" as never)}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        {t("studio.v9.center.scenePosition" as never, {
          current: String(sceneIndex + 1),
          total: String(sceneCount),
        })}
      </p>
      {scene.description?.trim() ?
        <p className="mt-2 line-clamp-4 text-sm text-zinc-700">{scene.description}</p>
      : (
        <p className="mt-2 text-sm text-zinc-500">{t("studio.v9.center.noDescription" as never)}</p>
      )}
      {previewImage?.imageUrl ?
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage.imageUrl}
            alt=""
            className="max-h-48 w-full object-cover"
          />
        </div>
      : null}
    </section>
  );
}
