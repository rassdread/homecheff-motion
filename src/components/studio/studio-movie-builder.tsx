"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioJobCostConfirmModal } from "@/components/studio/studio-job-cost-confirm-modal";
import { StudioSceneImageHistoryPanel } from "@/components/studio/studio-scene-image-history-panel";
import { StudioStoryboardJobPanel } from "@/components/studio/studio-storyboard-job-panel";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { buildMoviePrepareChecklist } from "@/lib/studio-movie-prepare-checklist";
import {
  buildMovieBuilderDashboard,
  buildMovieBuilderStepStates,
  getNextIncompleteMovieBuilderStep,
  resolveCurrentMovieBuilderStep,
} from "@/lib/studio-movie-builder-steps";
import { isMotionHandoffReady } from "@/lib/studio-movie-readiness-score";
import { scenesWithoutCompletedImages } from "@/lib/studio-movie-scene-image";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import {
  fetchStoryboardImprovementSummaryApi,
  selectStudioSceneImageApi,
} from "@/lib/studio-scene-images-client";
import {
  createStudioJobApi,
  isStudioJobActive,
  listStudioJobsApi,
} from "@/lib/studio-jobs-client";
import {
  fetchStudioStoryboard,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { StoryboardImprovementSummary } from "@/types/studio-improvement";
import type { StudioJobCreateInput, StudioJobDetail, StudioJobListItem, StudioJobType } from "@/types/studio-job";
import {
  MOVIE_BUILDER_STEPS,
  type MovieBuilderStepId as StepId,
} from "@/types/studio-movie-builder";

type StudioMovieBuilderProps = {
  storyboardId: string;
};

function parseStepParam(value: string | null): StepId | null {
  if (!value) {
    return null;
  }
  return MOVIE_BUILDER_STEPS.includes(value as StepId) ? (value as StepId) : null;
}

export function StudioMovieBuilder({ storyboardId }: StudioMovieBuilderProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const searchParams = useSearchParams();
  const [storyboard, setStoryboard] = useState<StudioStoryboardDetail | null>(null);
  const [improvementSummary, setImprovementSummary] = useState<StoryboardImprovementSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<StudioJobListItem[]>([]);
  const [startingJob, setStartingJob] = useState(false);
  const [regenerateAll, setRegenerateAll] = useState(false);
  const [jobConfirm, setJobConfirm] = useState<{
    open: boolean;
    type: StudioJobType;
    input?: StudioJobCreateInput;
  } | null>(null);
  const [improveSelected, setImproveSelected] = useState<Set<string>>(new Set());
  const [selectBusy, setSelectBusy] = useState(false);

  const urlStep = parseStepParam(searchParams.get("step"));
  const [activeStep, setActiveStep] = useState<StepId>("prepare");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [sbRes, jobsRes, improveRes] = await Promise.all([
      fetchStudioStoryboard(storyboardId),
      listStudioJobsApi(storyboardId),
      fetchStoryboardImprovementSummaryApi(storyboardId),
    ]);
    if (!sbRes.ok) {
      setError((sbRes.data as { error?: string }).error ?? t("studio.storyboards.error.loadFailed"));
      setStoryboard(null);
    } else {
      setStoryboard(sbRes.data.storyboard);
    }
    if (jobsRes.ok) {
      setRecentJobs(jobsRes.data.jobs);
      const running = jobsRes.data.jobs.find((j) => isStudioJobActive(j.status));
      if (running) {
        setActiveJobId(running.id);
      }
    }
    if (improveRes.ok) {
      setImprovementSummary(improveRes.data.summary);
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

  const stepInitialized = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (urlStep) {
        setActiveStep(urlStep);
        return;
      }
      if (!storyboard || stepInitialized.current) {
        return;
      }
      stepInitialized.current = true;
      setActiveStep(resolveCurrentMovieBuilderStep(storyboard));
    });
  }, [storyboard, urlStep]);

  const dashboard = useMemo(
    () => (storyboard ? buildMovieBuilderDashboard(storyboard) : null),
    [storyboard]
  );
  const prepareChecklist = useMemo(
    () => (storyboard ? buildMoviePrepareChecklist(storyboard) : null),
    [storyboard]
  );
  const stepStates = useMemo(
    () => (storyboard ? buildMovieBuilderStepStates(storyboard, activeStep) : []),
    [storyboard, activeStep]
  );
  const jobBusy = recentJobs.some((j) => isStudioJobActive(j.status)) || Boolean(activeJobId);
  const motionReady = storyboard ? isMotionHandoffReady(storyboard) : false;
  const canModify = Boolean(
    storyboard && session.user && storyboard.ownerId === session.user.id
  );

  const openJobConfirm = (type: StudioJobType, input?: StudioJobCreateInput) => {
    setJobConfirm({ open: true, type, input });
  };

  const startStudioJob = async () => {
    if (!jobConfirm || !storyboard) {
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
    const jobsRes = await listStudioJobsApi(storyboardId);
    if (jobsRes.ok) {
      setRecentJobs(jobsRes.data.jobs);
    }
  };

  const handleJobFinished = async (job: StudioJobDetail) => {
    setActiveJobId(null);
    await load();
    if (job.type === "analyze_consistency" && job.status === "completed") {
      openJobConfirm("analyze_vision");
    }
  };

  const handleGenerateMissing = () => {
    if (!storyboard) {
      return;
    }
    const sceneIds = regenerateAll
      ? storyboard.scenes.map((s) => s.id)
      : scenesWithoutCompletedImages(storyboard.scenes).map((s) => s.id);
    if (sceneIds.length === 0) {
      setError(t("studio.movieBuilder.generate.allHaveImages"));
      return;
    }
    openJobConfirm("generate_scene_images", { sceneIds });
  };

  const handleImproveSelected = () => {
    if (improveSelected.size === 0) {
      return;
    }
    openJobConfirm("improve_weak_scenes", {
      sceneIds: [...improveSelected],
      options: { autoSelect: storyboard?.autoSelectImprovedImage },
    });
  };

  const handleSelectImage = async (sceneId: string, imageId: string) => {
    setSelectBusy(true);
    const res = await selectStudioSceneImageApi(storyboardId, sceneId, imageId);
    setSelectBusy(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.selectFailed"));
      return;
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

  const weakScenes = useMemo(
    () => (improvementSummary?.scenes ?? []).filter((s) => s.regeneration.action !== "ok"),
    [improvementSummary]
  );

  const goToStep = (step: StepId) => {
    setActiveStep(step);
    window.history.replaceState(
      null,
      "",
      `/studio/storyboards/${storyboardId}/movie-builder?step=${step}`
    );
  };

  const continueNext = () => {
    if (!storyboard) {
      return;
    }
    const next = getNextIncompleteMovieBuilderStep(storyboard, activeStep);
    if (next) {
      goToStep(next);
    }
  };

  if (loading) {
    return (
      <StudioAuthGate
        authTitleKey="studio.storyboards.authRequiredTitle"
        authBodyKey="studio.storyboards.authRequiredBody"
      >
        <main className={`flex-1 ${brand.softGradientBg}`}>
          <p className="px-6 py-12 text-sm text-zinc-500">{t("button.loading")}</p>
        </main>
      </StudioAuthGate>
    );
  }

  if (!storyboard) {
    return (
      <StudioAuthGate
        authTitleKey="studio.storyboards.authRequiredTitle"
        authBodyKey="studio.storyboards.authRequiredBody"
      >
        <main className={`flex-1 ${brand.softGradientBg}`}>
          <p className="px-6 py-12 text-sm text-red-700">{error || t("studio.storyboards.error.loadFailed")}</p>
        </main>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href={`/studio/storyboards/${storyboardId}`}
                className="text-sm font-medium text-[#006D52] hover:underline"
              >
                ← {t("studio.movieBuilder.backToStoryboard")}
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.movieBuilder.title")}</h1>
              <p className="mt-1 text-sm text-zinc-600">{storyboard.title}</p>
            </div>
            {dashboard ? (
              <button
                type="button"
                onClick={() => continueNext()}
                className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
              >
                {t("studio.movieBuilder.continueNext")}
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {dashboard ? (
            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.movieBuilder.dashboard.scenes")}</p>
                <p className="text-2xl font-bold text-zinc-900">{dashboard.sceneCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.movieBuilder.dashboard.images")}</p>
                <p className="text-2xl font-bold text-zinc-900">{dashboard.imagesReadyLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.movieBuilder.dashboard.consistency")}</p>
                <p className="text-2xl font-bold text-zinc-900">
                  {dashboard.averageConsistencyScore ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.movieBuilder.dashboard.vision")}</p>
                <p className="text-2xl font-bold text-zinc-900">{dashboard.averageVisionScore ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.movieBuilder.dashboard.characters")}
                </p>
                <p className="text-2xl font-bold text-zinc-900">
                  {dashboard.readiness.averageCharacterIdentityScore ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.movieBuilder.dashboard.readiness")}</p>
                <p className="text-2xl font-bold text-[#006D52]">
                  {t(`studio.movieBuilder.readiness.${dashboard.readiness.tier}`)}
                </p>
                <p className="text-xs text-zinc-500">
                  {t("studio.movieBuilder.dashboard.warnings", {
                    count: String(dashboard.warningCount),
                  })}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
            <nav className="space-y-2">
              {stepStates.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                    activeStep === step.id
                      ? "border-[#006D52] bg-[#006D52]/5 text-[#006D52]"
                      : step.complete
                        ? "border-emerald-200 text-emerald-800"
                        : "border-zinc-200 text-zinc-700"
                  }`}
                >
                  <span>{step.complete ? "✓" : "○"}</span>
                  {t(`studio.movieBuilder.steps.${step.id}`)}
                </button>
              ))}
            </nav>

            <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
              {(activeJobId || jobBusy) && (
                <StudioStoryboardJobPanel
                  storyboardId={storyboardId}
                  activeJobId={activeJobId}
                  recentJobs={recentJobs}
                  canModify={canModify}
                  onJobUpdated={() => {}}
                  onJobFinished={(job) => void handleJobFinished(job)}
                  onRefreshJobs={() => void load()}
                />
              )}

              {activeStep === "prepare" && prepareChecklist ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("studio.movieBuilder.steps.prepare")}</h2>
                  <p className="text-sm text-zinc-600">
                    {prepareChecklist.ready
                      ? t("studio.movieBuilder.prepare.ready")
                      : t("studio.movieBuilder.prepare.needsAttention")}
                  </p>
                  <ul className="space-y-2">
                    {prepareChecklist.items.map((item) => (
                      <li
                        key={item.id}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          item.passed
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-amber-200 bg-amber-50 text-amber-950"
                        }`}
                      >
                        {item.passed ? "✓ " : "• "}
                        {t(item.labelKey)}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/studio/storyboards/${storyboardId}`}
                    className="text-sm font-semibold text-[#006D52] hover:underline"
                  >
                    {t("studio.movieBuilder.prepare.editScenes")}
                  </Link>
                </div>
              ) : null}

              {activeStep === "generate" ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("studio.movieBuilder.steps.generate")}</h2>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={regenerateAll}
                      onChange={(e) => setRegenerateAll(e.target.checked)}
                    />
                    {t("studio.movieBuilder.generate.regenerateAll")}
                  </label>
                  {canModify ? (
                    <button
                      type="button"
                      disabled={jobBusy}
                      onClick={() => handleGenerateMissing()}
                      className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {t("studio.movieBuilder.generate.missing")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {activeStep === "analyze" ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("studio.movieBuilder.steps.analyze")}</h2>
                  <p className="text-sm text-zinc-600">{t("studio.movieBuilder.analyze.hint")}</p>
                  {canModify ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={jobBusy}
                        onClick={() => openJobConfirm("analyze_consistency")}
                        className="rounded-full border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
                      >
                        {t("studio.movieBuilder.analyze.consistency")}
                      </button>
                      <button
                        type="button"
                        disabled={jobBusy}
                        onClick={() => openJobConfirm("analyze_vision")}
                        className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
                      >
                        {t("studio.movieBuilder.analyze.vision")}
                      </button>
                      <button
                        type="button"
                        disabled={jobBusy}
                        onClick={() => openJobConfirm("analyze_character_consistency")}
                        className="rounded-full border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-900 disabled:opacity-50"
                      >
                        {t("studio.movieBuilder.analyze.characters")}
                      </button>
                      <button
                        type="button"
                        disabled={jobBusy}
                        onClick={() => openJobConfirm("analyze_consistency")}
                        className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {t("studio.movieBuilder.analyze.all")}
                      </button>
                    </div>
                  ) : null}
                  {dashboard ? (
                    <p className="text-sm text-zinc-700">
                      {t("studio.movieBuilder.analyze.scores", {
                        consistency: String(dashboard.averageConsistencyScore ?? "—"),
                        vision: String(dashboard.averageVisionScore ?? "—"),
                        characters: String(
                          dashboard.readiness.averageCharacterIdentityScore ?? "—"
                        ),
                        weak: String(dashboard.readiness.unresolvedWeakSceneCount),
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {activeStep === "improve" ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("studio.movieBuilder.steps.improve")}</h2>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={storyboard.autoSelectImprovedImage}
                      onChange={(e) =>
                        void updateStudioStoryboardApi(storyboardId, {
                          autoSelectImprovedImage: e.target.checked,
                        }).then((res) => {
                          if (res.ok) {
                            setStoryboard(res.data.storyboard);
                          }
                        })
                      }
                    />
                    {t("studio.improve.autoSelectLabel")}
                  </label>
                  {weakScenes.length === 0 ? (
                    <p className="text-sm text-emerald-800">{t("studio.improve.allScenesOk")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {weakScenes.map((scene) => (
                        <li
                          key={scene.sceneId}
                          className="flex items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={improveSelected.has(scene.sceneId)}
                            onChange={() => {
                              setImproveSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(scene.sceneId)) {
                                  next.delete(scene.sceneId);
                                } else {
                                  next.add(scene.sceneId);
                                }
                                return next;
                              });
                            }}
                          />
                          <div>
                            <p className="font-semibold">
                              {t("studio.improve.sceneLine", {
                                order: String(scene.order + 1),
                                title: scene.sceneTitle || t("studio.correction.unnamedScene"),
                              })}
                            </p>
                            <p className="text-xs text-zinc-600">
                              Vision {scene.visionScore ?? "—"} · Consistency{" "}
                              {scene.consistencyScore ?? "—"}
                            </p>
                            <p className="text-xs text-amber-900">{scene.regeneration.reason}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canModify ? (
                    <button
                      type="button"
                      disabled={jobBusy || improveSelected.size === 0}
                      onClick={() => handleImproveSelected()}
                      className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {t("studio.movieBuilder.improve.selected")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {activeStep === "select" ? (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">{t("studio.movieBuilder.steps.select")}</h2>
                  {[...storyboard.scenes]
                    .sort((a, b) => a.order - b.order)
                    .map((scene) => (
                      <div key={scene.id} className="rounded-xl border border-zinc-200 p-4">
                        <p className="font-semibold text-zinc-900">
                          {t("studio.improve.sceneLine", {
                            order: String(scene.order + 1),
                            title: scene.title || t("studio.correction.unnamedScene"),
                          })}
                        </p>
                        <StudioSceneImageHistoryPanel
                          images={scene.sceneImages}
                          selectedImageId={scene.selectedSceneImageId}
                          canModify={canModify && !selectBusy}
                          onSelectImage={(id) => void handleSelectImage(scene.id, id)}
                        />
                      </div>
                    ))}
                </div>
              ) : null}

              {activeStep === "motion" ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("studio.movieBuilder.steps.motion")}</h2>
                  <p className="text-sm text-zinc-600">{t("studio.movieBuilder.motion.hint")}</p>
                  {motionReady ? (
                    <Link
                      href={`/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`}
                      className="inline-block rounded-full bg-[#0067B1] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      {t("studio.storyboards.openInMotion")}
                    </Link>
                  ) : (
                    <p className="text-sm text-amber-900">{t("studio.movieBuilder.motion.notReady")}</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
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
