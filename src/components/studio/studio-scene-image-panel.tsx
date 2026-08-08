"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildRegenerationRecommendation } from "@/lib/build-regeneration-recommendation";
import { isRecommendedSceneImage } from "@/lib/studio-combined-image-score";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { scoreSceneImageHealth } from "@/lib/studio-scene-image-health";
import { studioSceneDetailToPromptInput, studioSceneDetailToSnapshot } from "@/lib/studio-scene-to-prompt-input";
import {
  analyzeStudioSceneImageConsistencyApi,
  analyzeStudioSceneImageVisionApi,
  deleteStudioSceneImageApi,
  generateStudioSceneImageApi,
  previewStudioSceneCorrectionsApi,
  improveStudioSceneImageApi,
  selectStudioSceneImageApi,
} from "@/lib/studio-scene-images-client";
import { StudioImproveImageConfirmModal } from "@/components/studio/studio-improve-image-confirm-modal";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { useActiveTranslator } from "@/i18n/client";
import {
  SCENE_GENERATION_DISPLAY_CREDITS,
} from "@/lib/studio-credit-constants";
import { trackStudioCreativeEvent } from "@/lib/studio-creative-analytics";
import { StudioGenerationStatusChrome } from "@/components/studio/studio-generation-status-chrome";
import type { StudioSceneDetail } from "@/types/studio-api";
import { StudioSceneConsistencyPanel } from "@/components/studio/studio-scene-consistency-panel";
import { StudioSceneCharacterIdentityPanel } from "@/components/studio/studio-scene-character-identity-panel";
import { StudioSceneVisionPanel } from "@/components/studio/studio-scene-vision-panel";
import { StudioSceneCorrectionPanel } from "@/components/studio/studio-scene-correction-panel";
import { StudioSceneImageHistoryPanel } from "@/components/studio/studio-scene-image-history-panel";
import type { SceneCorrectionPreviewResponse } from "@/types/studio-correction";
import type { CombinedImprovementScore } from "@/types/studio-improvement";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";
import type { CorrectionRecommendation } from "@/types/studio-correction";

type StudioSceneImagePanelProps = {
  storyboardId: string;
  scene: StudioSceneDetail;
  styleProfile: StudioPromptStyleProfile;
  characterDriftRecommendations?: CorrectionRecommendation[];
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  autoSelectImprovedImage?: boolean;
};

export function StudioSceneImagePanel({
  storyboardId,
  scene,
  styleProfile,
  characterDriftRecommendations = [],
  canModify,
  onSceneUpdated,
  autoSelectImprovedImage = true,
}: StudioSceneImagePanelProps) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [panelTab, setPanelTab] = useState<
    "image" | "consistency" | "vision" | "corrections"
  >("image");
  const [correctionPreview, setCorrectionPreview] =
    useState<SceneCorrectionPreviewResponse | null>(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [lastImprovement, setLastImprovement] = useState<CombinedImprovementScore | null>(null);
  const [historyFocusId, setHistoryFocusId] = useState<string | null>(null);
  const [improveModalOpen, setImproveModalOpen] = useState(false);

  const latest = scene.sceneImages[0] ?? null;
  const focusId = historyFocusId ?? scene.selectedSceneImageId ?? latest?.id ?? null;
  const selected =
    scene.sceneImages.find((img) => img.id === focusId) ??
    scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
    latest;

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

  const correctionRecs = useMemo(() => {
    if (!selected?.consistencyReport) {
      return [];
    }
    return buildCombinedCorrectionRecommendations({
      consistencyReport: selected.consistencyReport,
      visionReport: selected.visionReport,
      characterDriftRecommendations,
    });
  }, [selected, characterDriftRecommendations]);

  const regenerationRec = useMemo(() => {
    if (!selected) {
      return null;
    }
    return buildRegenerationRecommendation({
      image: selected,
      consistencyReport: selected.consistencyReport,
      visionReport: selected.visionReport,
      recommendations: correctionRecs,
    });
  }, [selected, correctionRecs]);

  const promptPreview = useMemo(() => {
    const input = studioSceneDetailToPromptInput(scene, styleProfile);
    return buildScenePromptFromInput({
      ...input,
      correctionRecommendations:
        correctionRecs.length > 0 ? correctionRecs : input.correctionRecommendations,
    });
  }, [scene, styleProfile, correctionRecs]);

  const loadCorrectionPreview = useCallback(async () => {
    const target = selected;
    if (!target || target.status !== "completed") {
      setCorrectionPreview(null);
      return;
    }
    setCorrectionLoading(true);
    const res = await previewStudioSceneCorrectionsApi(storyboardId, scene.id, target.id);
    setCorrectionLoading(false);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.correction.error.previewFailed")
      );
      return;
    }
    setCorrectionPreview(res.data.preview);
  }, [storyboardId, scene.id, selected, t]);

  const openCorrectionsTab = () => {
    setPanelTab("corrections");
    void loadCorrectionPreview();
  };

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    trackStudioCreativeEvent("GENERATION_STARTED", {
      storyboardId,
      action: "scene_generation",
      tool: "visual",
    });
    const res = await generateStudioSceneImageApi(storyboardId, scene.id);
    setBusy(false);
    if (!res.ok) {
      trackStudioCreativeEvent("GENERATION_FAILED", {
        storyboardId,
        action: "scene_generation",
        tool: "visual",
      });
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.generateFailed"));
      return;
    }
    trackStudioCreativeEvent("GENERATION_SUCCESS", {
      storyboardId,
      action: "scene_generation",
      tool: "visual",
    });
    onSceneUpdated({
      ...scene,
      sceneImages: [res.data.image, ...scene.sceneImages],
    });
  };

  const handleConfirmImprove = async () => {
    const target = selected;
    if (!target || target.status !== "completed") {
      return;
    }
    setBusy(true);
    setError("");
    setImproveModalOpen(false);
    const res = await improveStudioSceneImageApi(storyboardId, scene.id, {
      sourceImageId: target.id,
      autoSelect: autoSelectImprovedImage,
    });
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.improve.error.failed"));
      return;
    }
    setLastImprovement(res.data.improvement);
    setCorrectionPreview({
      sourceImageId: target.id,
      basePrompt: res.data.correction.basePrompt,
      correctedPrompt: res.data.correction.correctedPrompt,
      recommendations: res.data.correction.recommendations,
      patches: res.data.correction.patches,
      consistencyReport: res.data.consistencyReport,
    });
    onSceneUpdated(res.data.scene);
    setPanelTab("corrections");
  };

  const handleSelectHistoryImage = async (imageId: string) => {
    setHistoryFocusId(imageId);
    setBusy(true);
    const res = await selectStudioSceneImageApi(storyboardId, scene.id, imageId);
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.selectFailed"));
      return;
    }
    onSceneUpdated(res.data.scene);
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
  const visionReport = displayImage?.visionReport ?? latest?.visionReport ?? null;

  const handleReanalyzeVision = async () => {
    const target = displayImage ?? latest;
    if (!target || target.status !== "completed") {
      return;
    }
    setBusy(true);
    setError("");
    const res = await analyzeStudioSceneImageVisionApi(storyboardId, scene.id, target.id);
    setBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.vision.error.analyzeFailed"));
      return;
    }
    onSceneUpdated({
      ...scene,
      sceneImages: scene.sceneImages.map((img) =>
        img.id === res.data.image.id ? res.data.image : img
      ),
    });
  };

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
    if (panelTab === "corrections") {
      void loadCorrectionPreview();
    }
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

  const correctionCount = correctionPreview?.recommendations.length ?? correctionRecs.length;

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
        <button
          type="button"
          onClick={() => setPanelTab("vision")}
          className={`px-3 py-2 text-sm font-semibold ${
            panelTab === "vision"
              ? "border-b-2 border-[#0067B1] text-[#0067B1]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.vision.tabTitle")}
          {visionReport ? ` (${visionReport.overallVisionScore})` : ""}
        </button>
        <button
          type="button"
          onClick={openCorrectionsTab}
          className={`px-3 py-2 text-sm font-semibold ${
            panelTab === "corrections"
              ? "border-b-2 border-[#006D52] text-[#006D52]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.correction.tabTitle")}
          {correctionCount > 0 ? ` (${correctionCount})` : ""}
        </button>
      </div>

      {panelTab === "image" &&
      regenerationRec &&
      regenerationRec.action !== "ok" &&
      displayImage?.status === "completed" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">{t("studio.improve.recommendationHint")}</p>
          <p className="mt-1">{regenerationRec.reason}</p>
          {canModify ? (
            <button
              type="button"
              disabled={busy || correctionLoading}
              onClick={() => setImproveModalOpen(true)}
              className="mt-3 rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("studio.improve.regenerateWithImprovements")}
            </button>
          ) : null}
        </div>
      ) : null}

      {panelTab === "consistency" ? (
        <>
          <StudioSceneCharacterIdentityPanel
            sceneCharacters={scene.characters}
            consistencyReport={consistencyReport}
            visionReport={visionReport}
          />
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

      {panelTab === "vision" ? (
        <>
          <StudioSceneCharacterIdentityPanel
            sceneCharacters={scene.characters}
            consistencyReport={consistencyReport}
            visionReport={visionReport}
          />
          <StudioSceneVisionPanel image={displayImage ?? latest} report={visionReport} />
          {canModify && displayImage?.status === "completed" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReanalyzeVision()}
              className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1]"
            >
              {busy ? t("button.loading") : t("studio.vision.reanalyze")}
            </button>
          ) : null}
        </>
      ) : null}

      {panelTab === "corrections" ? (
        <>
          <StudioSceneCorrectionPanel
            preview={correctionPreview}
            loading={correctionLoading}
            image={displayImage ?? latest}
            improvement={lastImprovement}
          />
          <p className="text-xs text-zinc-500">{t("studio.correction.methodHint")}</p>
          {canModify && displayImage?.status === "completed" && regenerationRec?.action !== "ok" ? (
            <button
              type="button"
              disabled={busy || correctionLoading}
              onClick={() => setImproveModalOpen(true)}
              className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("studio.improve.improveImage")}
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
          {displayImage && isRecommendedSceneImage(displayImage, scene.sceneImages) ? (
            <span className="absolute right-3 top-3 rounded-full bg-[#0067B1] px-2 py-1 text-xs font-semibold text-white">
              {t("studio.improve.recommended")}
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
            <StudioGenerationStatusChrome
              className="w-full"
              status={latest?.status ?? (error ? "failed" : "ready")}
              busy={busy}
              label={t("studio.tools.visual")}
              onRetry={error || latest?.status === "failed" ? () => void handleGenerate() : undefined}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGenerate()}
              className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              data-testid="studio-scene-image-generate"
            >
              {busy
                ? t("studio.sceneImage.generating")
                : latest
                  ? `${t("studio.sceneImage.regenerate")} · ${t("studio.paidAction.credits", { credits: SCENE_GENERATION_DISPLAY_CREDITS })}`
                  : `${t("studio.sceneImage.generate")} · ${t("studio.paidAction.credits", { credits: SCENE_GENERATION_DISPLAY_CREDITS })}`}
            </button>
            <p className="w-full text-xs text-zinc-500" data-testid="studio-scene-image-credit-hint">
              {t("studio.paidAction.beforeGenerate", {
                action: latest ? t("studio.sceneImage.regenerate") : t("studio.sceneImage.generate"),
                credits: SCENE_GENERATION_DISPLAY_CREDITS,
              })}
            </p>
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
                {displayImage?.status === "completed" &&
                regenerationRec &&
                regenerationRec.action !== "ok" ? (
                  <button
                    type="button"
                    disabled={busy || correctionLoading}
                    onClick={() => setImproveModalOpen(true)}
                    className="rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("studio.improve.improveImage")}
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

      {panelTab === "image" ? (
        <div>
          <p className="text-sm font-semibold text-zinc-800">{t("studio.improve.historyTitle")}</p>
          <div className="mt-2">
            <StudioSceneImageHistoryPanel
              images={scene.sceneImages}
              selectedImageId={scene.selectedSceneImageId ?? focusId}
              canModify={canModify}
              onSelectImage={(id) => void handleSelectHistoryImage(id)}
              onViewPrompt={(img) => {
                setShowPrompt(true);
                setHistoryFocusId(img.id);
              }}
              onViewCorrections={(id) => {
                setHistoryFocusId(id);
                openCorrectionsTab();
              }}
            />
          </div>
        </div>
      ) : null}

      <StudioImproveImageConfirmModal
        open={improveModalOpen}
        recommendation={regenerationRec}
        onCancel={() => setImproveModalOpen(false)}
        onConfirm={() => void handleConfirmImprove()}
        busy={busy}
      />

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
