"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioSortableSceneCard } from "@/components/studio/studio-sortable-scene-card";
import { StudioStoryboardTimeline } from "@/components/studio/studio-storyboard-timeline";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import { reorderSceneIds } from "@/lib/studio-scene-order";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { StudioAiDirectorPanel } from "@/components/studio/studio-ai-director-panel";
import { StudioStoryIntelligencePanel } from "@/components/studio/studio-story-intelligence-panel";
import { StudioTextBeatsPreviewPanel } from "@/components/studio/studio-text-beats-preview-panel";
import { StudioSceneImagePlannerPanel } from "@/components/studio/studio-scene-image-planner-panel";
import { StudioMusicDirectorPanel } from "@/components/studio/studio-music-director-panel";
import { StudioSoundDirectorPanel } from "@/components/studio/studio-sound-director-panel";
import { StudioAudioProductionDirectorPanel } from "@/components/studio/studio-audio-production-director-panel";
import { StudioAudioAssetDirectorPanel } from "@/components/studio/studio-audio-asset-director-panel";
import { StudioStoryboardVoiceIdentityPanel } from "@/components/studio/studio-storyboard-voice-identity-panel";
import { StudioStoryboardMediaAssetPanel } from "@/components/studio/studio-storyboard-media-asset-panel";
import { StudioExecutionPlanPanel } from "@/components/studio/studio-execution-plan-panel";
import { StudioSceneCompositionPanel } from "@/components/studio/studio-scene-composition-panel";
import { StudioAssetPlacementPanel } from "@/components/studio/studio-asset-placement-panel";
import { StudioCharacterBlockingPanel } from "@/components/studio/studio-character-blocking-panel";
import { StudioVoiceDirectorPanel } from "@/components/studio/studio-voice-director-panel";
import { StudioPerformanceSimulator } from "@/components/studio/studio-performance-simulator";
import { StudioProductionCenter } from "@/components/studio/studio-production-center";
import {
  STUDIO_DIRECTOR_PROFILES,
  normalizeStudioDirectorProfile,
  type StudioDirectorProfile,
} from "@/lib/studio-director-profiles";
import {
  STUDIO_PROMPT_STYLE_PROFILES,
  normalizeStudioPromptStyleProfile,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";
import { StudioConsistencyTimelinePanel } from "@/components/studio/studio-consistency-timeline-panel";
import { StudioVisionTimelinePanel } from "@/components/studio/studio-vision-timeline-panel";
import { StudioStoryboardCorrectionPanel } from "@/components/studio/studio-storyboard-correction-panel";
import { StudioJobCostConfirmModal } from "@/components/studio/studio-job-cost-confirm-modal";
import { StudioStoryboardImprovementPanel } from "@/components/studio/studio-storyboard-improvement-panel";
import { StudioStoryboardJobPanel } from "@/components/studio/studio-storyboard-job-panel";
import { buildStoryboardConsistencyReport } from "@/lib/studio-consistency-timeline";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import {
  buildCharacterDriftCorrectionRecommendationsForStoryboard,
  buildCharacterReportFromStoryboardDetail,
} from "@/lib/studio-character-timeline";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import { buildStoryboardVisionReport } from "@/lib/studio-vision-timeline";
import { StudioCharacterConsistencyPanel } from "@/components/studio/studio-character-consistency-panel";
import {
  fetchStoryboardImprovementSummaryApi,
  generateStoryboardCorrectionsApi,
} from "@/lib/studio-scene-images-client";
import {
  createStudioJobApi,
  isStudioJobActive,
  listStudioJobsApi,
} from "@/lib/studio-jobs-client";
import type { StoryboardImprovementSummary } from "@/types/studio-improvement";
import type { StoryboardConsistencyReport } from "@/types/studio-consistency";
import type { StoryboardVisionReport } from "@/types/studio-vision-consistency";
import type { StoryboardCorrectionSummary } from "@/types/studio-correction";
import {
  createStudioSceneApi,
  deleteStudioSceneApi,
  duplicateStudioSceneApi,
  fetchStudioStoryboard,
  reorderStudioScenesApi,
  updateStudioSceneApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import type { StudioJobCreateInput, StudioJobDetail, StudioJobListItem, StudioJobType } from "@/types/studio-job";

type StudioStoryboardEditorProps = {
  storyboardId: string;
};

export function StudioStoryboardEditor({ storyboardId }: StudioStoryboardEditorProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [storyboard, setStoryboard] = useState<StudioStoryboardDetail | null>(null);
  const [locations, setLocations] = useState<StudioLocationListItem[]>([]);
  const [characters, setCharacters] = useState<StudioCharacterListItem[]>([]);
  const [props, setProps] = useState<StudioPropListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [busySceneId, setBusySceneId] = useState<string | null>(null);
  const [savingStyleProfile, setSavingStyleProfile] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<StudioJobListItem[]>([]);
  const [startingJob, setStartingJob] = useState(false);
  const [jobConfirm, setJobConfirm] = useState<{
    open: boolean;
    type: StudioJobType;
    input?: StudioJobCreateInput;
  } | null>(null);
  const [visionReport, setVisionReport] = useState<StoryboardVisionReport | null>(null);
  const [consistencyReport, setConsistencyReport] = useState<StoryboardConsistencyReport | null>(
    null
  );
  const [correctionSummary, setCorrectionSummary] = useState<StoryboardCorrectionSummary | null>(
    null
  );
  const [generatingCorrections, setGeneratingCorrections] = useState(false);
  const [improvementSummary, setImprovementSummary] = useState<StoryboardImprovementSummary | null>(
    null
  );
  const [loadingImprovements, setLoadingImprovements] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [sbRes, locRes, charRes, propRes] = await Promise.all([
      fetchStudioStoryboard(storyboardId),
      fetchStudioLocations(),
      fetchStudioCharacters(),
      fetchStudioProps(),
    ]);
    if (!sbRes.ok) {
      setError((sbRes.data as { error?: string }).error ?? t("studio.storyboards.error.loadFailed"));
      setStoryboard(null);
    } else {
      setStoryboard(sbRes.data.storyboard);
      if (!expandedId && sbRes.data.storyboard.scenes[0]) {
        setExpandedId(sbRes.data.storyboard.scenes[0].id);
      }
    }
    if (locRes.ok) setLocations(locRes.data.locations);
    if (charRes.ok) setCharacters(charRes.data.characters);
    if (propRes.ok) setProps(propRes.data.props);
    const jobsRes = await listStudioJobsApi(storyboardId);
    if (jobsRes.ok) {
      setRecentJobs(jobsRes.data.jobs);
      const running = jobsRes.data.jobs.find((j) => isStudioJobActive(j.status));
      if (running) {
        setActiveJobId(running.id);
      }
    }
    setLoading(false);
  }, [storyboardId, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const styleProfile = useMemo(
    () =>
      storyboard
        ? normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile)
        : ("commercial" as StudioPromptStyleProfile),
    [storyboard]
  );

  const directorProfile = useMemo(
    () =>
      storyboard
        ? normalizeStudioDirectorProfile(storyboard.directorProfile)
        : ("commercial" as StudioDirectorProfile),
    [storyboard]
  );

  const [savingDirectorProfile, setSavingDirectorProfile] = useState(false);

  const handleDirectorProfileChange = async (next: StudioDirectorProfile) => {
    if (!storyboard || next === directorProfile) {
      return;
    }
    setSavingDirectorProfile(true);
    setError("");
    const res = await updateStudioStoryboardApi(storyboardId, { directorProfile: next });
    setSavingDirectorProfile(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.saveFailed"));
      return;
    }
    setStoryboard(res.data.storyboard);
  };

  const handleStyleProfileChange = async (next: StudioPromptStyleProfile) => {
    if (!storyboard || next === styleProfile) {
      return;
    }
    setSavingStyleProfile(true);
    setError("");
    const res = await updateStudioStoryboardApi(storyboardId, { promptStyleProfile: next });
    setSavingStyleProfile(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.saveFailed"));
      return;
    }
    setStoryboard(res.data.storyboard);
  };

  const scenes = useMemo(
    () => (storyboard ? [...storyboard.scenes].sort((a, b) => a.order - b.order) : []),
    [storyboard]
  );

  const flowScenes = useMemo(
    () => (storyboard ? storyboardToFlowInput(storyboard) : []),
    [storyboard]
  );

  const characterConsistencyReport = useMemo(
    () => (storyboard ? buildCharacterReportFromStoryboardDetail(storyboard) : null),
    [storyboard]
  );

  const characterDriftRecommendations = useMemo((): CorrectionRecommendation[] => {
    if (!storyboard) {
      return [];
    }
    return buildCharacterDriftCorrectionRecommendationsForStoryboard(storyboard);
  }, [storyboard]);

  const canModify = Boolean(
    storyboard && session.user && storyboard.ownerId === session.user.id
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !storyboard) {
      return;
    }
    const ids = scenes.map((s) => s.id);
    const next = reorderSceneIds(ids, String(active.id), String(over.id));
    if (!next) {
      return;
    }
    const res = await reorderStudioScenesApi(storyboardId, next);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.reorderFailed"));
      return;
    }
    await load();
  };

  const handleAddScene = async () => {
    const n = scenes.length + 1;
    const res = await createStudioSceneApi(storyboardId, {
      title: t("studio.storyboards.defaultSceneTitle", { number: String(n) }),
    });
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.addSceneFailed"));
      return;
    }
    setExpandedId(res.data.scene.id);
    await load();
  };

  const handleSceneUpdated = (updated: StudioStoryboardDetail["scenes"][number]) => {
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s) => (s.id === updated.id ? updated : s)),
          }
        : prev
    );
  };

  const handleStoryboardNotesUpdated = (notes: string) => {
    setStoryboard((prev) => (prev ? { ...prev, aiDirectorPrompt: notes } : prev));
  };

  const loadRecentJobs = useCallback(async () => {
    const res = await listStudioJobsApi(storyboardId);
    if (res.ok) {
      setRecentJobs(res.data.jobs);
      const running = res.data.jobs.find((j) => isStudioJobActive(j.status));
      if (running) {
        setActiveJobId(running.id);
      }
    }
  }, [storyboardId]);

  const jobBusy = useMemo(
    () => recentJobs.some((j) => isStudioJobActive(j.status)) || Boolean(activeJobId),
    [recentJobs, activeJobId]
  );

  const openJobConfirm = (type: StudioJobType, input?: StudioJobCreateInput) => {
    setJobConfirm({ open: true, type, input });
  };

  const startStudioJob = async () => {
    if (!jobConfirm) {
      return;
    }
    setStartingJob(true);
    setError("");
    const res = await createStudioJobApi(storyboardId, jobConfirm.type, jobConfirm.input);
    setStartingJob(false);
    setJobConfirm(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.jobs.error.startFailed"));
      return;
    }
    setActiveJobId(res.data.job.id);
    await loadRecentJobs();
  };

  const applyReportsFromStoryboard = (sb: StudioStoryboardDetail) => {
    setConsistencyReport(
      buildStoryboardConsistencyReport({
        storyboardId: sb.id,
        scenes: sb.scenes.map((scene) => {
          const pick =
            scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
            scene.sceneImages.find((img) => img.status === "completed");
          return {
            sceneId: scene.id,
            sceneTitle: scene.title,
            order: scene.order,
            imageId: pick?.id ?? null,
            report: pick?.consistencyReport ?? null,
          };
        }),
      })
    );
    setVisionReport(
      buildStoryboardVisionReport({
        storyboardId: sb.id,
        scenes: sb.scenes.map((scene) => {
          const pick =
            scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
            scene.sceneImages.find((img) => img.status === "completed");
          return {
            sceneId: scene.id,
            sceneTitle: scene.title,
            order: scene.order,
            imageId: pick?.id ?? null,
            report: pick?.visionReport ?? null,
          };
        }),
      })
    );
  };

  const handleJobFinished = async (job: StudioJobDetail) => {
    setActiveJobId(null);
    await load();
    await loadRecentJobs();
    if (storyboard) {
      const sbRes = await fetchStudioStoryboard(storyboardId);
      if (sbRes.ok) {
        setStoryboard(sbRes.data.storyboard);
        if (
          job.type === "analyze_consistency" ||
          job.type === "analyze_vision" ||
          job.type === "analyze_character_consistency" ||
          job.type === "generate_scene_images" ||
          job.type === "improve_weak_scenes"
        ) {
          applyReportsFromStoryboard(sbRes.data.storyboard);
        }
      }
    }
    if (job.type === "improve_weak_scenes") {
      await loadImprovementSummary();
    }
  };

  const loadImprovementSummary = useCallback(async () => {
    setLoadingImprovements(true);
    setError("");
    const res = await fetchStoryboardImprovementSummaryApi(storyboardId);
    setLoadingImprovements(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.improve.error.failed"));
      return;
    }
    setImprovementSummary(res.data.summary);
  }, [storyboardId, t]);

  const handleAutoSelectChange = async (value: boolean) => {
    if (!storyboard) {
      return;
    }
    setError("");
    const res = await updateStudioStoryboardApi(storyboardId, {
      autoSelectImprovedImage: value,
    });
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.saveFailed"));
      return;
    }
    setStoryboard(res.data.storyboard);
  };

  const handleGenerateCorrections = async () => {
    setGeneratingCorrections(true);
    setError("");
    const res = await generateStoryboardCorrectionsApi(storyboardId);
    setGeneratingCorrections(false);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.correction.error.storyboardFailed")
      );
      return;
    }
    setCorrectionSummary(res.data.summary);
    setConsistencyReport(res.data.summary.consistencyReport);
    await load();
  };

  const handleSaveScene = async (sceneId: string, patch: StudioSceneUpdateInput) => {
    setSavingSceneId(sceneId);
    const res = await updateStudioSceneApi(storyboardId, sceneId, patch);
    setSavingSceneId(null);
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.storyboards.error.saveSceneFailed"));
    }
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s) => (s.id === sceneId ? res.data.scene : s)),
          }
        : prev
    );
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!window.confirm(t("studio.storyboards.deleteSceneConfirm"))) {
      return;
    }
    setBusySceneId(sceneId);
    const res = await deleteStudioSceneApi(storyboardId, sceneId);
    setBusySceneId(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.deleteSceneFailed"));
      return;
    }
    if (expandedId === sceneId) {
      setExpandedId(null);
    }
    await load();
  };

  const handleDuplicateScene = async (sceneId: string) => {
    setBusySceneId(sceneId);
    const res = await duplicateStudioSceneApi(storyboardId, sceneId);
    setBusySceneId(null);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.storyboards.error.duplicateSceneFailed")
      );
      return;
    }
    setExpandedId(res.data.scene.id);
    await load();
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 sm:py-14">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={studioWorkspaceHref(storyboardId)}
                className="text-sm font-medium text-[#006D52] hover:underline"
              >
                ← {t("studio.workspace.backToWorkspace")}
              </Link>
              <span className="text-xs text-zinc-400">·</span>
              <Link
                href="/studio/storyboards"
                className="text-sm font-medium text-zinc-500 hover:underline"
              >
                {t("studio.storyboards.backToLibrary")}
              </Link>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{t("studio.workspace.classicEditorHint")}</p>
            {loading ? (
              <p className="mt-6 text-sm text-zinc-500">{t("button.loading")}</p>
            ) : storyboard ? (
              <>
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-zinc-900">{storyboard.title}</h1>
                    {storyboard.description ? (
                      <p className="mt-2 max-w-2xl text-sm text-zinc-600">{storyboard.description}</p>
                    ) : null}
                    <div className="mt-4 max-w-md">
                      <label className="text-sm font-medium text-zinc-700">
                        {t("studio.prompt.styleProfileLabel")}
                      </label>
                      <select
                        value={styleProfile}
                        disabled={!canModify || savingStyleProfile}
                        onChange={(e) =>
                          void handleStyleProfileChange(
                            normalizeStudioPromptStyleProfile(e.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {STUDIO_PROMPT_STYLE_PROFILES.map((profile) => (
                          <option key={profile} value={profile}>
                            {t(`studio.prompt.styleProfile.${profile}`)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("studio.prompt.styleProfileHint")}
                      </p>
                    </div>
                    <div className="mt-4 max-w-md">
                      <label className="text-sm font-medium text-zinc-700">
                        {t("studio.director.profileLabel")}
                      </label>
                      <select
                        value={directorProfile}
                        disabled={!canModify || savingDirectorProfile}
                        onChange={(e) =>
                          void handleDirectorProfileChange(
                            normalizeStudioDirectorProfile(e.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {STUDIO_DIRECTOR_PROFILES.map((profile) => (
                          <option key={profile} value={profile}>
                            {t(`studio.director.director.${profile}`)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("studio.director.profileHint")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scenes.length > 0 ?
                      <Link
                        href={`/studio/storyboards/${storyboardId}/production`}
                        className="rounded-full border border-[#0067B1]/40 bg-[#0067B1]/10 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:opacity-90"
                      >
                        {t("studio.production.entryButton")}
                      </Link>
                    : null}
                    {scenes.length > 0 ? (
                      <Link
                        href={`/studio/storyboards/${storyboardId}/movie-builder`}
                        className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        {t("studio.movieBuilder.entryButton")}
                      </Link>
                    ) : null}
                    {scenes.length > 0 ? (
                      <Link
                        href={`/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`}
                        className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        {t("studio.storyboards.openInMotion")}
                      </Link>
                    ) : (
                      <span
                        title={t("studio.storyboards.openInMotionDisabledHint")}
                        className="cursor-not-allowed rounded-full bg-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600"
                      >
                        {t("studio.storyboards.openInMotion")}
                      </span>
                    )}
                    {canModify ? (
                      <>
                        <Link
                          href={`/studio/storyboards/${storyboardId}/edit`}
                          className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1]"
                        >
                          {t("studio.storyboards.editStoryboard")}
                        </Link>
                        <button
                          type="button"
                          disabled={jobBusy || scenes.length === 0}
                          onClick={() => openJobConfirm("generate_scene_images")}
                          className="rounded-full border border-[#006D52]/40 px-4 py-2 text-sm font-semibold text-[#006D52] disabled:opacity-50"
                        >
                          {jobBusy
                            ? t("studio.jobs.running")
                            : t("studio.sceneImage.bulkGenerateAll")}
                        </button>
                        <button
                          type="button"
                          disabled={jobBusy || scenes.length === 0}
                          onClick={() => openJobConfirm("analyze_consistency")}
                          className="rounded-full border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
                        >
                          {jobBusy
                            ? t("studio.jobs.running")
                            : t("studio.consistency.analyzeStoryboard")}
                        </button>
                        <button
                          type="button"
                          disabled={jobBusy || scenes.length === 0}
                          onClick={() => openJobConfirm("analyze_vision")}
                          className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
                        >
                          {jobBusy
                            ? t("studio.jobs.running")
                            : t("studio.vision.analyzeStoryboard")}
                        </button>
                        <button
                          type="button"
                          disabled={jobBusy || scenes.length === 0}
                          onClick={() => openJobConfirm("analyze_character_consistency")}
                          className="rounded-full border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-900 disabled:opacity-50"
                        >
                          {jobBusy
                            ? t("studio.jobs.running")
                            : t("studio.characterConsistency.analyzeStoryboard")}
                        </button>
                        <button
                          type="button"
                          disabled={jobBusy || generatingCorrections || scenes.length === 0}
                          onClick={() => void handleGenerateCorrections()}
                          className="rounded-full border border-[#006D52]/40 px-4 py-2 text-sm font-semibold text-[#006D52] disabled:opacity-50"
                        >
                          {generatingCorrections
                            ? t("studio.correction.generatingStoryboard")
                            : t("studio.correction.generateStoryboard")}
                        </button>
                        <button
                          type="button"
                          disabled={loadingImprovements || scenes.length === 0}
                          onClick={() => void loadImprovementSummary()}
                          className="rounded-full border border-amber-600/40 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
                        >
                          {loadingImprovements
                            ? t("studio.improve.loading")
                            : t("studio.improve.reviewImprovements")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAddScene()}
                          className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
                        >
                          {t("studio.storyboards.addScene")}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {storyboard && !loading ? (
            <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
              <div>
                {scenes.length > 0 ?
                  <div className="mb-6 space-y-0">
                    <StudioAiDirectorPanel
                      storyboard={storyboard}
                      canModify={canModify}
                      onStoryboardUpdated={(sb) => setStoryboard(sb)}
                      onScenesUpdated={async () => {
                        const res = await fetchStudioStoryboard(storyboardId);
                        if (res.ok && res.data.storyboard) {
                          setStoryboard(res.data.storyboard);
                        }
                      }}
                    />
                    <StudioStoryIntelligencePanel
                      storyboard={storyboard}
                      directorProfile={directorProfile}
                      canModify={canModify}
                      onScenesUpdated={async () => {
                        const res = await fetchStudioStoryboard(storyboardId);
                        if (res.ok && res.data.storyboard) {
                          setStoryboard(res.data.storyboard);
                        }
                      }}
                    />
                    <StudioTextBeatsPreviewPanel storyboard={storyboard} />
                    <StudioSceneImagePlannerPanel
                      storyboard={storyboard}
                      styleProfile={styleProfile}
                      directorProfile={directorProfile}
                    />
                    <StudioVoiceDirectorPanel
                      storyboard={storyboard}
                      canModify={canModify}
                      onStoryboardUpdated={(sb) => setStoryboard(sb)}
                    />
                    <StudioMusicDirectorPanel
                      storyboard={storyboard}
                      onUpdated={(sb) => setStoryboard(sb)}
                    />
                    <StudioSoundDirectorPanel
                      storyboard={storyboard}
                      onUpdated={(sb) => setStoryboard(sb)}
                    />
                    <StudioAudioProductionDirectorPanel
                      storyboard={storyboard}
                      onUpdated={(sb) => setStoryboard(sb)}
                    />
                    <StudioAudioAssetDirectorPanel
                      storyboard={storyboard}
                      onUpdated={(sb) => setStoryboard(sb)}
                    />
                    <StudioStoryboardVoiceIdentityPanel storyboard={storyboard} />
                    <StudioStoryboardMediaAssetPanel storyboard={storyboard} />
                    <StudioSceneCompositionPanel storyboard={storyboard} />
                    <StudioAssetPlacementPanel storyboard={storyboard} />
                    <StudioCharacterBlockingPanel storyboard={storyboard} />
                    <StudioExecutionPlanPanel storyboard={storyboard} />
                    <StudioPerformanceSimulator scenes={storyboard.scenes} />
                    <StudioProductionCenter
                      storyboard={storyboard}
                      storyboardId={storyboardId}
                      layout="embedded"
                    />
                  </div>
                : null}
                <h2 className="text-lg font-semibold text-zinc-900">
                  {t("studio.storyboards.scenesTitle")}
                </h2>
                {scenes.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">{t("studio.storyboards.noScenes")}</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
                    <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="mt-4 space-y-4">
                        {scenes.map((scene, index) => (
                          <StudioSortableSceneCard
                            key={scene.id}
                            storyboard={storyboard}
                            storyboardId={storyboardId}
                            scene={scene}
                            sceneIndex={index}
                            sceneCount={scenes.length}
                            flowScenes={flowScenes}
                            storyboardTitle={storyboard.title}
                            storyboardDescription={storyboard.description}
                            aiDirectorPrompt={storyboard.aiDirectorPrompt}
                            aiDirectorStyleStrength={storyboard.aiDirectorStyleStrength}
                            onStoryboardNotesUpdated={handleStoryboardNotesUpdated}
                            expanded={expandedId === scene.id}
                            onToggle={() =>
                              setExpandedId((id) => (id === scene.id ? null : scene.id))
                            }
                            locations={locations}
                            characters={characters}
                            props={props}
                            styleProfile={styleProfile}
                            directorProfile={directorProfile}
                            saving={savingSceneId === scene.id}
                            busy={busySceneId === scene.id}
                            canModify={canModify}
                            characterDriftRecommendations={characterDriftRecommendations}
                            onSave={handleSaveScene}
                            onSceneUpdated={handleSceneUpdated}
                            onDuplicate={handleDuplicateScene}
                            onDelete={handleDeleteScene}
                            autoSelectImprovedImage={storyboard.autoSelectImprovedImage}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <aside className="space-y-8">
                <StudioStoryboardJobPanel
                  storyboardId={storyboardId}
                  activeJobId={activeJobId}
                  recentJobs={recentJobs}
                  canModify={canModify}
                  onJobUpdated={() => {}}
                  onJobFinished={(job) => void handleJobFinished(job)}
                  onRefreshJobs={() => void loadRecentJobs()}
                />
                <StudioStoryboardImprovementPanel
                  summary={improvementSummary}
                  loading={loadingImprovements}
                  autoSelectImprovedImage={storyboard.autoSelectImprovedImage}
                  onAutoSelectChange={(value) => void handleAutoSelectChange(value)}
                  onRegenerateSelected={(ids) =>
                    openJobConfirm("improve_weak_scenes", {
                      sceneIds: ids,
                      options: { autoSelect: storyboard.autoSelectImprovedImage },
                    })
                  }
                  bulkBusy={jobBusy}
                  bulkProgress={jobBusy ? t("studio.jobs.running") : ""}
                />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {t("studio.correction.summaryTitle")}
                  </h2>
                  <div className="mt-4">
                    <StudioStoryboardCorrectionPanel
                      summary={correctionSummary}
                      loading={generatingCorrections}
                    />
                  </div>
                </div>
                <StudioVisionTimelinePanel report={visionReport} />
                <StudioConsistencyTimelinePanel report={consistencyReport} />
                <StudioCharacterConsistencyPanel report={characterConsistencyReport} />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {t("studio.storyboards.timelineTitle")}
                  </h2>
                  <div className="mt-4">
                    <StudioStoryboardTimeline scenes={scenes} />
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
      <StudioJobCostConfirmModal
        open={Boolean(jobConfirm?.open)}
        jobType={jobConfirm?.type ?? null}
        onCancel={() => setJobConfirm(null)}
        onConfirm={() => void startStudioJob()}
        busy={startingJob}
      />
    </StudioAuthGate>
  );
}
