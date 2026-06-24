"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import { persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  advanceOrchestratorPhase,
  analyzeProductionUpload,
  approveProductionPlan,
  buildPublishFinishHref,
  linkStoryboardToOrchestrator,
  readOrchestratorState,
  startProductionFromIntent,
  writeOrchestratorState,
} from "@/lib/studio-production-orchestrator";
import {
  STUDIO_PHASE_LABEL_KEYS,
  STUDIO_RUN_PHASE_LABEL_KEYS,
  STUDIO_STATUS_LABEL_KEYS,
} from "@/lib/studio-orchestrator-phases";
import { analyzeAudioWithFfprobe, runOrchestratorProduction } from "@/lib/studio-orchestrator-run-client";
import { buildRenderBatchPlanFromLongForm, buildRenderBatchPlanFromMusicVideo } from "@/lib/studio-render-batch-planner";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { attachCharacterToProduction } from "@/lib/studio-character-film-bridge";
import { detectStudioVideoIntent, isStudioVideoIntent } from "@/lib/studio-video-intents";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type {
  HcPersistedProductionAsset,
  ProductionExecutionState,
  ProductionTransaction,
  StudioOrchestratorRunPhase,
  StudioUserPhase,
  StudioVideoIntent,
} from "@/types/studio-video-production";
import { attachPersistedProductionAsset } from "@/lib/studio-orchestrator-asset-persist";
import { buildPhotoMoviePlan } from "@/lib/studio-photo-movie-plan";
import { buildRenderBatchPlanForOrchestrator } from "@/lib/studio-production-batch-plan";
import { orchestratorHasVideoEditOnly } from "@/lib/studio-orchestrator-approved-plan";
import { uploadOrchestratorAsset } from "@/lib/studio-orchestrator-run-client";

type Props = {
  hcProject: HomeCheffProjectPackage | null;
  onProjectChange?: (project: HomeCheffProjectPackage) => void;
  initialIntent?: StudioVideoIntent | null;
  initialIdea?: string;
  initialCharacterId?: string | null;
  initialAutoProduce?: boolean;
};

const USER_PHASES: StudioUserPhase[] = ["collect", "analyze", "plan", "generate", "finish"];

export function StudioProductionOrchestratorPanel({
  hcProject,
  onProjectChange,
  initialIntent,
  initialIdea,
  initialCharacterId,
  initialAutoProduce = false,
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [project, setProject] = useState(hcProject);
  const [idea, setIdea] = useState(initialIdea ?? "");
  const [intent, setIntent] = useState<StudioVideoIntent | null>(initialIntent ?? null);
  const [busy, setBusy] = useState(false);
  const [busyMessageKey, setBusyMessageKey] = useState<string>("studio.orchestrator.analyzing");
  const [runPhase, setRunPhase] = useState<StudioOrchestratorRunPhase | null>(null);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const autoProduceStartedRef = useRef(false);

  const persist = useCallback(
    (next: HomeCheffProjectPackage) => {
      persistHomeCheffProject(next);
      setProject(next);
      onProjectChange?.(next);
    },
    [onProjectChange]
  );

  useEffect(() => {
    queueMicrotask(() => setProject(hcProject));
  }, [hcProject]);

  useEffect(() => {
    if (!project || !initialIntent) return;
    const state = readOrchestratorState(project);
    if (state.intent) return;
    let next = startProductionFromIntent({
      project,
      intent: initialIntent,
      idea: initialIdea,
    });
    if (initialCharacterId) {
      next = attachCharacterToProduction(next, {
        characterId: initialCharacterId,
        characterName: initialIdea?.trim() || "Your character",
        motionReady: true,
      });
    }
    queueMicrotask(() => persist(next));
  }, [initialCharacterId, initialIdea, initialIntent, persist, project]);

  const orchestrator = useMemo(
    () => (project ? readOrchestratorState(project) : null),
    [project]
  );

  const userPhase = orchestrator?.userPhase ?? "collect";
  const phaseIndex = USER_PHASES.indexOf(userPhase);
  const activeRunPhase = runPhase ?? orchestrator?.runPhase ?? null;

  const renderPlan = useMemo(() => {
    if (orchestrator?.musicVideoPlan) {
      return buildRenderBatchPlanFromMusicVideo(orchestrator.musicVideoPlan);
    }
    if (orchestrator?.photoMoviePlan) {
      return buildRenderBatchPlanForOrchestrator({ photoMoviePlan: orchestrator.photoMoviePlan });
    }
    if (orchestrator?.longFormPlan) {
      return buildRenderBatchPlanFromLongForm(orchestrator.longFormPlan);
    }
    return null;
  }, [orchestrator]);

  const handleStartIntent = (selected: StudioVideoIntent) => {
    if (!project) return;
    setIntent(selected);
    const next = startProductionFromIntent({
      project,
      intent: selected,
      idea: idea.trim() || selected,
    });
    persist(advanceOrchestratorPhase(next, "collect"));
  };

  const handleAnalyze = async () => {
    if (!project || !intent) return;
    if (intent === "music_video" && !audioFile && !orchestrator?.musicAudioUrl) {
      setError(t("studio.orchestrator.musicRequired" as never));
      return;
    }
    setBusy(true);
    setError("");
    setBusyMessageKey("studio.orchestrator.analyzing");
    setRunPhase("analyzing_content");
    try {
      let workingProject = project;
      const persisted: HcPersistedProductionAsset[] = [...(orchestrator?.persistedAssets ?? [])];

      if (audioFile) {
        const uploaded = await uploadOrchestratorAsset(audioFile, "music");
        workingProject = attachPersistedProductionAsset(workingProject, uploaded);
        persisted.push(uploaded);
        const analyzed = await analyzeAudioWithFfprobe(audioFile);
        workingProject = writeOrchestratorState(workingProject, {
          audioAnalysis: analyzed.audioProfile,
          musicAudioUrl: uploaded.url,
        });
      }

      for (const photo of photoFiles) {
        const uploaded = await uploadOrchestratorAsset(photo, "photo");
        workingProject = attachPersistedProductionAsset(workingProject, uploaded);
        persisted.push(uploaded);
      }

      if (logoFile) {
        const uploaded = await uploadOrchestratorAsset(logoFile, "logo");
        workingProject = attachPersistedProductionAsset(workingProject, uploaded);
        persisted.push(uploaded);
      }

      for (const product of productFiles) {
        const uploaded = await uploadOrchestratorAsset(product, "product_image");
        workingProject = attachPersistedProductionAsset(workingProject, uploaded);
        persisted.push(uploaded);
      }

      if (videoFile) {
        const uploaded = await uploadOrchestratorAsset(videoFile, "video");
        workingProject = attachPersistedProductionAsset(workingProject, uploaded);
        persisted.push(uploaded);
        const editState = writeOrchestratorState(workingProject, { persistedAssets: persisted });
        if (orchestratorHasVideoEditOnly(readOrchestratorState(editState))) {
          persist(editState);
          router.push(
            `/publish/start?hcProject=${encodeURIComponent(project.id)}&video=${encodeURIComponent(uploaded.url)}&autoFinish=1`
          );
          return;
        }
      }

      const photoCount = persisted.filter((a) => a.kind === "photo").length;
      let photoMoviePlan;
      if (photoCount > 0 && (intent === "travel_vlog" || intent === "photo_story" || intent === "slideshow")) {
        photoMoviePlan = buildPhotoMoviePlan({ photoCount, intent });
        workingProject = writeOrchestratorState(workingProject, { photoMoviePlan, persistedAssets: persisted });
      } else if (persisted.length > 0) {
        workingProject = writeOrchestratorState(workingProject, { persistedAssets: persisted });
      }

      const { project: analyzedProject } = analyzeProductionUpload({
        project: workingProject,
        intent,
        imageCount: photoCount,
        videoMeta: videoFile
          ? { fileName: videoFile.name, fileSizeBytes: videoFile.size, mimeType: videoFile.type }
          : undefined,
      });

      const finalProject = photoMoviePlan
        ? writeOrchestratorState(analyzedProject, { photoMoviePlan })
        : analyzedProject;

      persist(advanceOrchestratorPhase(finalProject, "analyze"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
      setRunPhase(null);
    }
  };

  const handleCreateVideo = async () => {
    if (!project) return;
    setBusy(true);
    setError("");
    setRunPhase("planning_video");
    setBusyMessageKey("studio.orchestrator.creatingPlan");
    try {
      const approved = approveProductionPlan(project);
      persist(approved);

      setRunPhase("analyzing_content");
      setBusyMessageKey("studio.orchestrator.learningContent");

      const result = await runOrchestratorProduction({
        project: approved,
        idea: idea.trim() || orchestrator?.idea,
        characterId: orchestrator?.characterId,
      });

      setRunPhase("creating_scenes");
      setBusyMessageKey("studio.orchestrator.creatingPlan");

      let linked = linkStoryboardToOrchestrator(approved, result.storyboardId, {
        workflowReservation: result.reservation,
        runPhase: "rendering_video",
      });
      linked = writeOrchestratorState(linked, {
        workflowReservation: result.reservation,
        productionTransaction: result.productionTransaction,
        productionExecution: result.productionExecution,
        lifecycle: "rendering",
        runPhase: "rendering_video",
        status: "rendering",
      });
      persist(linked);

      setRunPhase("rendering_video");
      setBusyMessageKey("studio.production.creating");
      router.push(result.productionPath ?? `/studio/production?hcProject=${encodeURIComponent(project.id)}&storyboardId=${encodeURIComponent(result.storyboardId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video creation failed");
      setRunPhase(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!initialAutoProduce || !project || !intent || autoProduceStartedRef.current) return;
    if (intent === "music_video" && !orchestrator?.musicAudioUrl && !audioFile) return;
    autoProduceStartedRef.current = true;
    void (async () => {
      setBusy(true);
      setError("");
      setRunPhase("planning_video");
      try {
        let workingProject = project;
        const state = readOrchestratorState(workingProject);
        if (!state.analysisPlan) {
          const { project: analyzed } = analyzeProductionUpload({
            project: workingProject,
            intent,
            imageCount:
              state.persistedAssets?.filter((a) => a.kind === "photo" || a.kind === "photos").length ??
              0,
          });
          workingProject = advanceOrchestratorPhase(analyzed, "analyze");
          persist(workingProject);
        }
        const approved = approveProductionPlan(workingProject);
        persist(approved);
        const result = await runOrchestratorProduction({
          project: approved,
          idea: idea.trim() || readOrchestratorState(approved).idea,
          characterId: readOrchestratorState(approved).characterId,
        });
        let linked = linkStoryboardToOrchestrator(approved, result.storyboardId, {
          workflowReservation: result.reservation,
          runPhase: "rendering_video",
        });
        linked = writeOrchestratorState(linked, {
          workflowReservation: result.reservation,
          productionTransaction: result.productionTransaction,
          productionExecution: result.productionExecution,
          lifecycle: "rendering",
          runPhase: "rendering_video",
          status: "rendering",
        });
        persist(linked);
        router.push(
          result.productionPath ??
            `/studio/production?hcProject=${encodeURIComponent(project.id)}&storyboardId=${encodeURIComponent(result.storyboardId)}`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Production failed");
      } finally {
        setBusy(false);
        setRunPhase(null);
      }
    })();
  }, [audioFile, idea, initialAutoProduce, intent, orchestrator?.musicAudioUrl, persist, project, router]);

  const handleFinish = () => {
    if (!project) return;
    const state = readOrchestratorState(project);
    router.push(
      buildPublishFinishHref({
        hcProjectId: project.id,
        motionProjectId: state.motionProjectId,
        videoUrl: state.finalVideoUrl,
      }) + (state.storyboardId ? `&storyboardId=${encodeURIComponent(state.storyboardId)}` : "")
    );
  };

  if (!project) {
    return (
      <div className="flex justify-center py-8">
        <HomeCheffOrbitLoader state="loading" size="md" message={t("studio.orchestrator.loading" as never)} />
      </div>
    );
  }

  if (busy) {
    const runLabel = activeRunPhase ? t(STUDIO_RUN_PHASE_LABEL_KEYS[activeRunPhase] as never) : null;
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <HomeCheffOrbitLoader state="generating" size="lg" message={t(busyMessageKey as never)} />
        {runLabel ? <p className="text-sm text-white/70">{runLabel}</p> : null}
      </div>
    );
  }

  return (
    <section className={`space-y-5 ${studioVisual.cardOnDarkMuted} p-5`} data-testid="studio-production-orchestrator">
      <header>
        <h2 className={`text-xl font-bold ${studioVisual.headingOnDark}`}>
          {t("studio.orchestrator.title" as never)}
        </h2>
        <p className={`mt-1 text-sm ${studioVisual.bodyOnDark}`}>{t("studio.orchestrator.lead" as never)}</p>
      </header>

      {error ?
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      : null}

      <div className="flex flex-wrap gap-1">
        {USER_PHASES.map((phase, i) => (
          <span
            key={phase}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              phase === userPhase ? "bg-emerald-500/40 text-white"
              : i < phaseIndex ? "bg-white/15 text-white/80"
              : "text-white/35"
            }`}
          >
            {t(STUDIO_PHASE_LABEL_KEYS[phase] as never)}
          </span>
        ))}
      </div>

      {orchestrator?.status ?
        <p className="text-xs text-white/60">
          {t(STUDIO_STATUS_LABEL_KEYS[orchestrator.status] as never)}
        </p>
      : null}

      {activeRunPhase ?
        <p className="text-xs text-emerald-300">
          {t(STUDIO_RUN_PHASE_LABEL_KEYS[activeRunPhase] as never)}
        </p>
      : null}

      {userPhase === "collect" ?
        <>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder={t("studio.orchestrator.ideaPlaceholder" as never)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
          {!intent ?
            <div className="flex flex-wrap gap-2">
              {(["music_video", "travel_vlog", "product_commercial", "fashion_reel", "documentary"] as StudioVideoIntent[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`min-h-10 px-3 text-xs ${studioVisual.btnOutline}`}
                  onClick={() => handleStartIntent(id)}
                >
                  {t(`studio.orchestrator.intent.${id}` as never)}
                </button>
              ))}
            </div>
          : (
            <p className="text-sm text-emerald-300">
              {t(`studio.orchestrator.intent.${intent}` as never)}
            </p>
          )}
          {intent === "music_video" ?
            <label className="block text-sm text-white/80">
              {t("studio.orchestrator.uploadMusic" as never)}
              <input
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,.mp3,.wav,.m4a"
                className="mt-1 block w-full text-xs"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
            </label>
          : null}
          <label className="block text-sm text-white/80">
            {t("studio.orchestrator.uploadVideoOptional" as never)}
            <input
              type="file"
              accept="video/mp4,video/*"
              className="mt-1 block w-full text-xs"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {intent === "travel_vlog" || intent === "photo_story" || intent === "slideshow" ?
            <label className="block text-sm text-white/80">
              {t("studio.orchestrator.uploadPhotos" as never)}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="mt-1 block w-full text-xs"
                onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
              />
            </label>
          : null}
          {intent === "product_commercial" ?
            <>
              <label className="block text-sm text-white/80">
                {t("studio.orchestrator.uploadLogo" as never)}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="mt-1 block w-full text-xs"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="block text-sm text-white/80">
                {t("studio.orchestrator.uploadProducts" as never)}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="mt-1 block w-full text-xs"
                  onChange={(e) => setProductFiles(Array.from(e.target.files ?? []))}
                />
              </label>
            </>
          : null}
          <button
            type="button"
            disabled={!intent}
            className={`min-h-11 disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
            onClick={() => void handleAnalyze()}
          >
            {t("studio.orchestrator.continue" as never)}
          </button>
        </>
      : null}

      {userPhase === "analyze" && orchestrator?.analysisPlan ?
        <>
          <h3 className={`text-lg font-semibold ${studioVisual.headingOnDark}`}>
            {t("studio.orchestrator.priceTitle" as never)}
          </h3>
          <div className="space-y-4 text-sm text-white/85">
            {(orchestrator.analysisPlan.videoPlanContract?.phases ?? []).length > 0
              ? orchestrator.analysisPlan.videoPlanContract!.phases.map((phase) => (
              <div key={phase.id}>
                <p className="font-medium text-white">{t(phase.titleKey as never)}</p>
                {phase.items.length > 0 ?
                  <ul className="mt-1 space-y-0.5 pl-3 text-white/75">
                    {phase.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity != null && item.quantity > 0 ? `${item.quantity} ` : ""}
                        {t(item.labelKey as never)}
                        {item.cached ? " ✓" : ""}
                      </li>
                    ))}
                  </ul>
                : null}
              </div>
            ))
              : orchestrator.analysisPlan.userCostLines.map((line) => (
                <p key={line.labelKey}>{t(line.labelKey as never)}</p>
              ))}
            <p className="flex justify-between gap-4 border-t border-white/15 pt-2 font-bold">
              <span>{t("studio.orchestrator.costTotal" as never)}</span>
              <span>{orchestrator.analysisPlan.totalCredits}</span>
            </p>
          </div>
          {orchestrator.analysisPlan.cachedAnalyses.length > 0 ?
            <p className="text-xs text-emerald-300">{t("studio.orchestrator.cachedAnalysis" as never)}</p>
          : null}
          {renderPlan ?
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80">
              <p>{t("studio.orchestrator.estimatedLength" as never)}: {renderPlan.estimatedVideoSeconds}s</p>
              <p>{t("studio.orchestrator.estimatedRender" as never)}: {renderPlan.estimatedRenderMinutes} min</p>
              <p>{t("studio.orchestrator.sceneCount" as never)}: {renderPlan.totalScenes}</p>
            </div>
          : null}
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => persist(advanceOrchestratorPhase(project, "plan"))}>
            {t("studio.orchestrator.continue" as never)}
          </button>
        </>
      : null}

      {userPhase === "plan" ?
        <>
          <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("studio.orchestrator.planLead" as never)}</p>
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => void handleCreateVideo()}>
            {t("studio.orchestrator.createVideo" as never)}
          </button>
        </>
      : null}

      {userPhase === "generate" ?
        <>
          <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("studio.orchestrator.generateLead" as never)}</p>
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => void handleCreateVideo()}>
            {orchestrator?.storyboardId
              ? t("studio.orchestrator.continueRendering" as never)
              : t("studio.orchestrator.createVideo" as never)}
          </button>
        </>
      : null}

      {userPhase === "finish" ?
        <>
          <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("studio.orchestrator.finishLead" as never)}</p>
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={handleFinish}>
            {t("studio.orchestrator.finishYourVideo" as never)}
          </button>
        </>
      : null}
    </section>
  );
}

export function resolveOrchestratorIntentFromSearchParams(params: URLSearchParams): StudioVideoIntent | null {
  const raw = params.get("intent")?.trim();
  if (raw && isStudioVideoIntent(raw)) return raw;
  const idea = params.get("idea")?.trim();
  if (idea) return detectStudioVideoIntent(idea)?.intent ?? null;
  return null;
}
