"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { scoreSceneImageHealth } from "@/lib/studio-scene-image-health";
import { studioSceneDetailToPromptInput, studioSceneDetailToSnapshot } from "@/lib/studio-scene-to-prompt-input";
import {
  deleteStudioSceneImageApi,
  generateStudioSceneImageApi,
  selectStudioSceneImageApi,
} from "@/lib/studio-scene-images-client";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";
import { StudioSceneConsistencyPanel } from "@/components/studio/studio-scene-consistency-panel";
import { analyzeStudioSceneImageConsistencyApi } from "@/lib/studio-scene-images-client";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type StudioSceneImagePanelProps = {
  storyboardId: string;
  scene: StudioSceneDetail;
  styleProfile: StudioPromptStyleProfile;
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
};

export function StudioSceneImagePanel({
  storyboardId,
  scene,
  styleProfile,
  canModify,
  onSceneUpdated,
}: StudioSceneImagePanelProps) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [panelTab, setPanelTab] = useState<"image" | "consistency">("image");

  const latest = scene.sceneImages[0] ?? null;
  const selected =
    scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ?? latest;

  const health = useMemo(() => {
    const snap = studioSceneDetailToSnapshot(scene);
    return scoreSceneImageHealth({
      scene: snap,
      styleProfile,
      latestImageStatus: latest?.status ?? null,
    });
  }, [scene, styleProfile, latest?.status]);

  const tierLabel =
    health.tier === "strong"
      ? t("studio.prompt.quality.strong")
      : health.tier === "good"
        ? t("studio.prompt.quality.good")
        : t("studio.prompt.quality.weak");

  const promptPreview = useMemo(
    () => buildScenePromptFromInput(studioSceneDetailToPromptInput(scene, styleProfile)),
    [scene, styleProfile]
  );

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    const res = await generateStudioSceneImageApi(storyboardId, scene.id);
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.generateFailed"));
      return;
    }
    onSceneUpdated({
      ...scene,
      sceneImages: [res.data.image, ...scene.sceneImages],
    });
  };

  const handleRegenerate = () => void handleGenerate();

  const handleDelete = async (image: StudioSceneImageListItem) => {
    if (!window.confirm(t("studio.sceneImage.deleteConfirm"))) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await deleteStudioSceneImageApi(storyboardId, scene.id, image.id);
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.deleteFailed"));
      return;
    }
    onSceneUpdated({
      ...scene,
      selectedSceneImageId:
        scene.selectedSceneImageId === image.id ? null : scene.selectedSceneImageId,
      sceneImages: scene.sceneImages.filter((img) => img.id !== image.id),
    });
  };

  const handleSelectForMotion = async (image: StudioSceneImageListItem) => {
    setBusy(true);
    setError("");
    const res = await selectStudioSceneImageApi(storyboardId, scene.id, image.id);
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.selectFailed"));
      return;
    }
    onSceneUpdated(res.data.scene);
  };

  const displayImage = selected?.status === "completed" ? selected : latest;
  const consistencyReport =
    displayImage?.consistencyReport ?? latest?.consistencyReport ?? null;

  const handleReanalyzeConsistency = async () => {
    const target = displayImage ?? latest;
    if (!target || target.status !== "completed") {
      return;
    }
    setBusy(true);
    setError("");
    const res = await analyzeStudioSceneImageConsistencyApi(storyboardId, scene.id, target.id);
    setBusy(false);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.consistency.error.analyzeFailed")
      );
      return;
    }
    onSceneUpdated({
      ...scene,
      sceneImages: scene.sceneImages.map((img) =>
        img.id === res.data.image.id ? res.data.image : img
      ),
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "queued":
        return t("studio.sceneImage.status.queued");
      case "generating":
        return t("studio.sceneImage.status.generating");
      case "completed":
        return t("studio.sceneImage.status.completed");
      case "failed":
        return t("studio.sceneImage.status.failed");
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#006D52]">{t("studio.sceneImage.panelTitle")}</p>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {t("studio.sceneImage.healthLabel")}: {tierLabel} ({health.score})
        </span>
      </div>

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setPanelTab("image")}
          className={`px-3 py-2 text-sm font-semibold ${
            panelTab === "image"
              ? "border-b-2 border-[#006D52] text-[#006D52]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.sceneImage.tab.image")}
        </button>
        <button
          type="button"
          onClick={() => setPanelTab("consistency")}
          className={`px-3 py-2 text-sm font-semibold ${
            panelTab === "consistency"
              ? "border-b-2 border-[#006D52] text-[#006D52]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.consistency.tabTitle")}
          {consistencyReport ? ` (${consistencyReport.overallScore})` : ""}
        </button>
      </div>

      {panelTab === "consistency" ? (
        <>
          <StudioSceneConsistencyPanel image={displayImage ?? latest} report={consistencyReport} />
          {canModify && displayImage?.status === "completed" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReanalyzeConsistency()}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              {busy ? t("button.loading") : t("studio.consistency.reanalyze")}
            </button>
          ) : null}
        </>
      ) : null}

      {panelTab === "image" && displayImage?.status === "completed" && displayImage.imageUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
          <Image
            src={displayImage.thumbnailUrl || displayImage.imageUrl}
            alt={scene.title || t("studio.sceneImage.previewAlt")}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
            unoptimized
          />
          {scene.selectedSceneImageId === displayImage.id ? (
            <span className="absolute left-3 top-3 rounded-full bg-[#006D52] px-2 py-1 text-xs font-semibold text-white">
              {t("studio.sceneImage.selectedBadge")}
            </span>
          ) : null}
        </div>
      ) : panelTab === "image" ? (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
          {latest && latest.status !== "completed"
            ? statusLabel(latest.status)
            : t("studio.sceneImage.noImageYet")}
        </div>
      ) : null}

      {panelTab === "image" && latest ? (
        <dl className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-zinc-500">{t("studio.sceneImage.meta.status")}</dt>
            <dd>{statusLabel(latest.status)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-500">{t("studio.sceneImage.meta.provider")}</dt>
            <dd>{latest.provider}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-500">{t("studio.sceneImage.meta.promptVersion")}</dt>
            <dd>
              v{latest.promptVersion} · gen {latest.generationVersion}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-500">{t("studio.sceneImage.meta.created")}</dt>
            <dd>{new Date(latest.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      ) : null}

      {panelTab === "image" && showPrompt && latest?.generatedPrompt ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.sceneImage.generatedPrompt")}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{latest.generatedPrompt}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {panelTab === "image" ? (
      <div className="flex flex-wrap gap-2">
        {canModify ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGenerate()}
              className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy
                ? t("studio.sceneImage.generating")
                : latest
                  ? t("studio.sceneImage.regenerate")
                  : t("studio.sceneImage.generate")}
            </button>
            {latest?.status === "completed" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowPrompt((v) => !v)}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
                >
                  {t("studio.sceneImage.viewPrompt")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFullscreenUrl(displayImage?.imageUrl ?? null)}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
                >
                  {t("studio.sceneImage.fullscreen")}
                </button>
                {displayImage && scene.selectedSceneImageId !== displayImage.id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSelectForMotion(displayImage)}
                    className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("studio.sceneImage.useInMotion")}
                  </button>
                ) : null}
                {latest ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(latest)}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                  >
                    {t("studio.sceneImage.delete")}
                  </button>
                ) : null}
              </>
            ) : latest?.status === "failed" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRegenerate()}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                {t("studio.sceneImage.regenerate")}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      ) : null}

      {panelTab === "image" ? (
      <p className="text-xs text-zinc-500">
        {t("studio.sceneImage.promptStrengthHint", {
          score: String(promptPreview.metadata.qualityScore),
        })}
      </p>
      ) : null}

      {fullscreenUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal
          onClick={() => setFullscreenUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold"
            onClick={() => setFullscreenUrl(null)}
          >
            {t("studio.sceneImage.closeFullscreen")}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenUrl}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
