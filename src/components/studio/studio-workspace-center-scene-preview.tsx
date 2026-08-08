"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  /** When true, reduce editor chrome and enlarge composition preview. */
  previewMode?: boolean;
  onExitPreview?: () => void;
  onEnterPreview?: () => void;
};

export function StudioWorkspaceCenterScenePreview({
  scene,
  sceneIndex,
  sceneCount,
  previewMode = false,
  onExitPreview,
  onEnterPreview,
}: Props) {
  const t = useActiveTranslator();
  const previewImage =
    scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
    scene.sceneImages[0] ??
    null;

  return (
    <section
      className={`mb-4 rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 ${
        previewMode ? "ring-2 ring-[#006D52]/20" : ""
      }`}
      data-testid="studio-center-scene-preview"
      data-preview-mode={previewMode ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {previewMode ?
              t("studio.workspace.previewModeLabel")
            : t("studio.v9.center.activeScene" as never)}
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
        </div>
        {previewMode && onExitPreview ?
          <button
            type="button"
            onClick={onExitPreview}
            className="min-h-10 rounded-full bg-[#006D52] px-3 text-xs font-semibold text-white"
            data-testid="studio-exit-preview"
          >
            {t("studio.workspace.backToEdit")}
          </button>
        : !previewMode && onEnterPreview ?
          <button
            type="button"
            onClick={onEnterPreview}
            className="min-h-10 rounded-full border border-zinc-300 px-3 text-xs font-semibold text-zinc-800"
            data-testid="studio-enter-preview"
          >
            {t("studio.workspace.enterPreview")}
          </button>
        : null}
      </div>
      {scene.description?.trim() ?
        <p className={`mt-2 text-sm text-zinc-700 ${previewMode ? "" : "line-clamp-4"}`}>
          {scene.description}
        </p>
      : (
        <p className="mt-2 text-sm text-zinc-500">{t("studio.v9.center.noDescription" as never)}</p>
      )}
      {previewImage?.imageUrl ?
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage.imageUrl}
            alt=""
            className={`w-full object-cover ${previewMode ? "max-h-[min(70vh,560px)]" : "max-h-48"}`}
          />
        </div>
      : null}
      {previewMode ?
        <p className="mt-3 text-xs text-zinc-500">{t("studio.workspace.previewModeHint")}</p>
      : null}
    </section>
  );
}
