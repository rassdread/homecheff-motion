"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HomeCheffAssetPickerModal, type AssetPickerSelection } from "@/components/library/homecheff-asset-picker-modal";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioCharacterAnalysisCard } from "@/components/studio/studio-character-analysis-card";
import { AssistantWizardPrefillBanner } from "@/components/assistant/assistant-wizard-prefill-banner";
import { useAssistantWizardPrefill } from "@/hooks/use-assistant-wizard-prefill";
import { applyAssistantPrefillToMotionWizard } from "@/lib/assistant-wizard-prefill-apply";
import { useActiveTranslator } from "@/i18n/client";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import {
  dataFlowIdForCluster,
  trackCharacterClusterEvent,
} from "@/lib/character-cluster-analytics";
import { saveCharacterFromCluster } from "@/lib/character-cluster-save";
import { attachCharacterToStoryboardScene } from "@/lib/studio-character-entry-actions";
import {
  buildFullBodyGenerationPrompt,
  canAdvanceMotionWizardStep,
  createEmptyMotionReadyWizardState,
  motionReadyWizardSeedFromSource,
  motionReadyWizardToAssetDraft,
  nextMotionWizardStep,
  seedAnalysisFromVision,
  shouldOpenEditorByDefault,
} from "@/lib/motion-ready-character-wizard";
import { runAssetReferenceGeneration } from "@/lib/studio-asset-wizard-reference-generation";
import { triggerWizardSourceVisionAnalysis } from "@/lib/studio-asset-vision-trigger";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { MotionReadyWizardState, MotionReadyWizardStep } from "@/types/motion-ready-character-wizard";

const STEP_ORDER: MotionReadyWizardStep[] = [
  "upload",
  "analysis",
  "readiness_summary",
  "dynamic_questions",
  "generate",
  "preview",
  "save",
  "complete",
];

type Props = {
  projectId?: string | null;
  projectTitle?: string | null;
  storyboardId?: string | null;
  sceneId?: string | null;
  sourceImage?: string | null;
  sourceAsset?: string | null;
  sourceName?: string | null;
  returnTo?: string | null;
  requirementId?: string | null;
};

export function StudioMotionReadyCharacterWizard({
  projectId,
  projectTitle,
  storyboardId,
  sceneId,
  sourceImage,
  sourceAsset,
  sourceName,
  returnTo,
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const { prefill, hasPrefill, clearPrefill } = useAssistantWizardPrefill();
  const prefillAppliedRef = useRef(false);
  const sourceBootstrapRef = useRef(false);
  const [state, setState] = useState<MotionReadyWizardState>(() =>
    sourceImage?.trim()
      ? motionReadyWizardSeedFromSource({
          sourceImage: sourceImage.trim(),
          sourceName: sourceName ?? undefined,
          projectId: projectId ?? sourceAsset ?? null,
          projectTitle: projectTitle ?? null,
        })
      : createEmptyMotionReadyWizardState({ id: projectId, title: projectTitle })
  );
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(state.step);

  useEffect(() => {
    trackCharacterClusterEvent("character_motion_ready", "started");
  }, []);

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) {
      return;
    }
    prefillAppliedRef.current = true;
    setState((prev) => applyAssistantPrefillToMotionWizard(prev, prefill));
  }, [prefill]);

  const goNext = useCallback(() => {
    const next = nextMotionWizardStep(state.step);
    if (next) {
      setState((prev) => ({ ...prev, step: next }));
    }
  }, [state.step]);

  const runVisionAnalysis = useCallback(
    async (workingState: MotionReadyWizardState) => {
      const draftForVision = motionReadyWizardToAssetDraft(workingState);
      const visionRes = await triggerWizardSourceVisionAnalysis({
        draft: draftForVision,
        kind: "character",
        derivationJobId: crypto.randomUUID(),
      });
      if (!visionRes.ok || !visionRes.patch.sourceVisionAnalysis) {
        setState((prev) => ({
          ...prev,
          visionStatus: "failed",
          visionError: visionRes.ok ? t("motionReady.wizard.error.analysisFailed" as never) : visionRes.error,
        }));
        return;
      }
      setState((prev) =>
        seedAnalysisFromVision(
          { ...prev, visionStatus: "ready", step: "readiness_summary" },
          visionRes.patch.sourceVisionAnalysis!
        )
      );
    },
    [t]
  );

  const beginSourceAnalysis = useCallback(
    async (input: {
      sourceImage: string;
      sourceStorageKey?: string;
      sourceName: string;
    }) => {
      setUploading(true);
      setError("");
      const seeded = motionReadyWizardSeedFromSource({
        sourceImage: input.sourceImage,
        sourceStorageKey: input.sourceStorageKey,
        sourceName: input.sourceName,
        projectId: projectId ?? sourceAsset ?? null,
        projectTitle: projectTitle ?? null,
      });
      setState(seeded);
      try {
        await runVisionAnalysis(seeded);
      } catch {
        setState((prev) => ({
          ...prev,
          visionStatus: "failed",
          visionError: t("motionReady.wizard.error.analysisFailed" as never),
        }));
      } finally {
        setUploading(false);
      }
    },
    [projectId, projectTitle, runVisionAnalysis, sourceAsset, t]
  );

  useEffect(() => {
    const url = sourceImage?.trim();
    if (!url || sourceBootstrapRef.current) {
      return;
    }
    sourceBootstrapRef.current = true;
    void beginSourceAnalysis({
      sourceImage: url,
      sourceName: sourceName?.trim() || "Reference",
    });
  }, [beginSourceAnalysis, sourceImage, sourceName]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await postWizardImageUpload(formData);
      const name = file.name.replace(/\.[^.]+$/, "");
      await beginSourceAnalysis({
        sourceImage: uploaded.workingImageUrl,
        sourceStorageKey: uploaded.workingStorageKey,
        sourceName: name,
      });
    } catch (e) {
      setError(e instanceof ImageUploadError ? e.message : t("studio.assetCreation.input.uploadFailed" as never));
      setUploading(false);
    }
  };

  const handleLibraryPick = (selection: AssetPickerSelection) => {
    setLibraryOpen(false);
    if (!selection.url?.trim()) {
      return;
    }
    void beginSourceAnalysis({
      sourceImage: selection.url,
      sourceStorageKey: selection.storageKey,
      sourceName: selection.name,
    });
  };

  const handleGenerate = async () => {
    if (!state.visionAnalysis) {
      return;
    }
    setBusy(true);
    setError("");
    setState((prev) => ({ ...prev, generationStatus: "generating", step: "generate" }));
    const workingDraft = motionReadyWizardToAssetDraft(state);
    const generationId = crypto.randomUUID();
    const prompt = buildFullBodyGenerationPrompt({
      vision: state.visionAnalysis,
      answers: state.answers,
      missingParts: state.missingParts,
    });
    const genDraft = {
      ...workingDraft,
      referenceMode: "generate" as const,
      referenceGenerationId: generationId,
      summaryPrompt: prompt,
      sourceTransformChange: prompt,
    };
    const result = await runAssetReferenceGeneration({ draft: genDraft, kind: "character" });
    if (!result.outcome.ok) {
      const failure = result.outcome;
      setState((prev) => ({
        ...prev,
        generationStatus: "failed",
        generationError: failure.error,
      }));
      setBusy(false);
      return;
    }
    const success = result.outcome;
    setState((prev) => ({
      ...prev,
      generationStatus: "ready",
      generatedFullBodyUrl: success.referenceImageUrl,
      generatedFullBodyStorageKey: success.referenceStorageKey,
      transparentPngUrl: success.referenceImageUrl,
      step: "preview",
    }));
    setBusy(false);
  };

  const handleApprove = () => {
    setState((prev) => ({ ...prev, previewApproved: true, step: "save" }));
  };

  const handleSave = async () => {
    setBusy(true);
    setError("");
    try {
      const saveDraft = motionReadyWizardToAssetDraft({ ...state, previewApproved: true });
      const result = await saveCharacterFromCluster({
        draft: saveDraft,
        route: "motion-ready",
        storyboardId: storyboardId ?? null,
        projectId: state.projectId,
        projectTitle: state.projectTitle,
        characterName: state.characterName,
        isMascot: saveDraft.identityAssetType === "mascot",
        engineMetadata: state.engineSaveMetadata,
      });
      trackCharacterClusterEvent("character_motion_ready", "completed");
      if (storyboardId && sceneId && result.characterId) {
        await attachCharacterToStoryboardScene({
          storyboardId,
          sceneId,
          characterId: result.characterId,
          currentCharacterIds: [],
        });
      }
      setState((prev) => ({
        ...prev,
        savedCharacterId: result.characterId,
        step: "complete",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("motionReady.wizard.error.saveFailed" as never));
    } finally {
      setBusy(false);
    }
  };

  const openAdvancedEditor = () => {
    setState((prev) => ({ ...prev, openEditorRequested: true }));
    router.push(`/editor?characterId=${state.savedCharacterId ?? ""}`);
  };

  return (
    <StudioAuthGate>
      <main className={`mx-auto max-w-3xl px-4 py-8 ${studioVisual.pageBg}`} data-testid="motion-ready-character-wizard" data-flow-id={dataFlowIdForCluster("character_motion_ready")}>
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#006D52]">
            {t("motionReady.wizard.eyebrow" as never)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{t("motionReady.wizard.title" as never)}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("motionReady.wizard.subtitle" as never)}</p>
        </header>

        {hasPrefill && prefill ? (
          <AssistantWizardPrefillBanner prefill={prefill} onClear={clearPrefill} />
        ) : null}

        <ol className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {STEP_ORDER.slice(0, 7).map((step, index) => (
            <li
              key={step}
              className={index <= stepIndex ? "text-[#006D52]" : ""}
            >
              {index + 1}. {t(`motionReady.wizard.step.${step}` as never)}
            </li>
          ))}
        </ol>

        <section className={`mt-6 rounded-2xl border border-zinc-200 bg-white p-5 ${studioVisual.editorSurface}`}>
          {state.step === "upload" ?
            <div className="space-y-4" data-testid="motion-wizard-upload">
              <p className="text-sm text-zinc-700">{t("motionReady.wizard.upload.lead" as never)}</p>
              <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 hover:border-[#006D52]/40">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleUpload(file);
                    }
                  }}
                />
                {uploading ? t("button.loading" as never) : t("motionReady.wizard.upload.cta" as never)}
              </label>
              <button
                type="button"
                disabled={uploading}
                onClick={() => setLibraryOpen(true)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                data-testid="motion-wizard-library"
              >
                {t("motionReady.wizard.upload.library" as never)}
              </button>
            </div>
          : null}

          {state.step === "analysis" || state.step === "readiness_summary" ?
            <div className="space-y-4" data-testid="motion-wizard-analysis">
              {state.engineSummary ?
                <StudioCharacterAnalysisCard summary={state.engineSummary} />
              : null}
              {state.step === "readiness_summary" ?
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="motion-wizard-readiness">
                  <p className="text-sm font-semibold text-amber-900">
                    {t("motionReady.wizard.readiness.score", { score: String(state.readinessScore) } as never)}
                  </p>
                  <p className="mt-2 text-sm text-amber-900">
                    {t("motionReady.wizard.readiness.explain" as never)}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        {t("motionReady.wizard.readiness.available" as never)}
                      </p>
                      <p className="text-sm">{state.availableParts.map((p) => t(`motionReady.wizard.part.${p}` as never)).join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        {t("motionReady.wizard.readiness.needed" as never)}
                      </p>
                      <p className="text-sm">{state.missingParts.map((p) => t(`motionReady.wizard.part.${p}` as never)).join(", ")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-4 rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
                    onClick={goNext}
                  >
                    {t("motionReady.wizard.continue" as never)}
                  </button>
                </div>
              : null}
            </div>
          : null}

          {state.step === "dynamic_questions" ?
            <div className="space-y-4" data-testid="motion-wizard-questions">
              <h2 className="text-lg font-semibold text-zinc-900">
                {t("motionReady.wizard.questions.title" as never)}
              </h2>
              {state.questions.map((question) => (
                <div key={question.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900">{t(question.labelKey as never)}</p>
                    {question.aiSuggestionKey ?
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#0067B1]"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            answers: {
                              ...prev.answers,
                              ...(question.id === "body_style"
                                ? { bodyStyle: question.aiSuggestionValue as "realistic" | "mascot_cartoon" }
                                : question.id === "clothing"
                                  ? { clothing: question.aiSuggestionValue }
                                  : question.id === "pose"
                                    ? { pose: question.aiSuggestionValue as typeof prev.answers.pose }
                                    : question.id === "keep_clothing"
                                      ? { keepExistingClothing: true }
                                      : question.id === "remove_background"
                                        ? { removeBackground: true }
                                        : question.id === "preserve_mascot_style"
                                          ? { preserveMascotStyle: true }
                                          : { clarifyHandsFeet: true }),
                            },
                          }))
                        }
                      >
                        {t("motionReady.wizard.aiSuggestion" as never)}
                      </button>
                    : null}
                  </div>
                  {question.type === "choice" && question.options ?
                    <div className="mt-2 flex flex-wrap gap-2">
                      {question.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              answers: {
                                ...prev.answers,
                                ...(question.id === "body_style"
                                  ? { bodyStyle: opt.id as "realistic" | "mascot_cartoon" }
                                  : { pose: opt.id as typeof prev.answers.pose }),
                              },
                            }))
                          }
                        >
                          {t(opt.labelKey as never)}
                        </button>
                      ))}
                    </div>
                  : null}
                  {question.type === "text" ?
                    <input
                      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={state.answers.clothing ?? ""}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, answers: { ...prev.answers, clothing: e.target.value } }))
                      }
                    />
                  : null}
                  {question.type === "boolean" ?
                    <div className="mt-2 flex gap-2">
                      {[true, false].map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              answers: {
                                ...prev.answers,
                                ...(question.id === "keep_clothing"
                                  ? { keepExistingClothing: value }
                                  : question.id === "remove_background"
                                    ? { removeBackground: value }
                                    : question.id === "preserve_mascot_style"
                                      ? { preserveMascotStyle: value }
                                      : { clarifyHandsFeet: value }),
                              },
                            }))
                          }
                        >
                          {value ? "Ja" : "Nee"}
                        </button>
                      ))}
                    </div>
                  : null}
                </div>
              ))}
              <button
                type="button"
                disabled={!canAdvanceMotionWizardStep(state)}
                className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void handleGenerate()}
              >
                {t("motionReady.wizard.generate.cta" as never)}
              </button>
            </div>
          : null}

          {state.step === "generate" && busy ?
            <p className="text-sm text-zinc-600">{t("motionReady.wizard.generate.running" as never)}</p>
          : null}

          {state.step === "preview" ?
            <div className="space-y-4" data-testid="motion-wizard-preview">
              <h2 className="text-lg font-semibold text-zinc-900">{t("motionReady.wizard.preview.title" as never)}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">{t("motionReady.wizard.preview.original" as never)}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.sourceReferenceImageUrl} alt="" className="mt-2 rounded-xl border object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">{t("motionReady.wizard.preview.generated" as never)}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.generatedFullBodyUrl} alt="" className="mt-2 rounded-xl border object-cover" />
                </div>
              </div>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {["head", "face", "torso", "hands", "feet", "background", "style"].map((id) => (
                  <li key={id} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-900">
                    ✓ {t(`motionReady.wizard.preview.check.${id}` as never)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white" onClick={handleApprove}>
                  {t("motionReady.wizard.preview.approve" as never)}
                </button>
                <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => void handleGenerate()}>
                  {t("motionReady.wizard.preview.regenerate" as never)}
                </button>
                <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={openAdvancedEditor} data-testid="motion-wizard-open-editor">
                  {t("motionReady.wizard.preview.advancedEditor" as never)}
                </button>
              </div>
            </div>
          : null}

          {state.step === "save" ?
            <div className="space-y-4" data-testid="motion-wizard-save">
              <label className="block text-sm font-medium text-zinc-800">
                {t("motionReady.wizard.save.name" as never)}
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={state.characterName}
                  onChange={(e) => setState((prev) => ({ ...prev, characterName: e.target.value }))}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void handleSave()}
              >
                {t("motionReady.wizard.save.cta" as never)}
              </button>
            </div>
          : null}

          {state.step === "complete" ?
            <div className="space-y-4" data-testid="motion-wizard-complete">
              <p className="text-lg font-semibold text-emerald-800">{t("motionReady.wizard.complete.title" as never)}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/studio/storyboards" className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white">
                  {t("motionReady.wizard.complete.useInStory" as never)}
                </Link>
                <Link href="/motion" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                  {t("motionReady.wizard.complete.openMotion" as never)}
                </Link>
                <Link href="/studio/characters/motion-ready" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                  {t("motionReady.wizard.complete.another" as never)}
                </Link>
                {returnTo ?
                  <Link href={returnTo} className="rounded-xl border px-4 py-2 text-sm font-semibold">
                    {t("motionReady.wizard.complete.return" as never)}
                  </Link>
                : null}
                <Link href="/studio/assets/creative/characters" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                  {t("motionReady.wizard.complete.library" as never)}
                </Link>
              </div>
              {!shouldOpenEditorByDefault(state) ?
                <p className="text-xs text-zinc-500">{t("motionReady.wizard.complete.noEditor" as never)}</p>
              : null}
            </div>
          : null}

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {state.generationError ? <p className="mt-3 text-sm text-red-700">{state.generationError}</p> : null}
        </section>
      </main>
      <HomeCheffAssetPickerModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibraryPick}
        initialCategory="characters"
      />
    </StudioAuthGate>
  );
}
