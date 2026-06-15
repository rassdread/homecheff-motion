"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioCharacterAnalysisCard } from "@/components/studio/studio-character-analysis-card";
import { StudioCharacterDynamicQuestionsPanel } from "@/components/studio/studio-character-dynamic-questions-panel";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  dataFlowIdForCluster,
  trackCharacterClusterEvent,
} from "@/lib/character-cluster-analytics";
import { runCharacterCreationPipeline } from "@/lib/studio-character-generation-pipeline";
import { registerCompletedGenerationInLibraryClient } from "@/lib/library-consistency-client";
import {
  allCharacterDynamicQuestionsAnswered,
} from "@/lib/character-dynamic-questions";
import {
  analyzeCharacterIdea,
  characterNewWizardToAssetDraft,
  createEmptyCharacterNewWizardState,
  type CharacterNewWizardState,
} from "@/lib/character-new-wizard";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

type Props = {
  projectId?: string | null;
  projectTitle?: string | null;
  storyboardId?: string | null;
};

export function StudioCharacterNewGuidedWizard({ projectId, projectTitle, storyboardId }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const router = useRouter();
  const [state, setState] = useState<CharacterNewWizardState>(() =>
    createEmptyCharacterNewWizardState({ id: projectId, title: projectTitle })
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trackCharacterClusterEvent("character_new", "started");
  }, []);

  const handleAnalyze = () => {
    if (!state.idea.trim()) {
      return;
    }
    setState((prev) =>
      analyzeCharacterIdea(prev, locale === "nl" ? "nl" : "en")
    );
  };

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setError("");
    setState((prev) => ({ ...prev, step: "generate", generationError: "" }));
    const draft = characterNewWizardToAssetDraft(state);
    try {
      const result = await runCharacterCreationPipeline({
        draft,
        storyboardId: storyboardId ?? null,
        onProgress: () => undefined,
      });
      setState((prev) => ({
        ...prev,
        generatedImageUrl: result.imageUrl,
        generatedStorageKey: draft.referenceStorageKey,
        savedCharacterId: result.characterId,
        step: "preview",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("characterCluster.error.generate" as never));
      setState((prev) => ({ ...prev, step: "questions" }));
    } finally {
      setBusy(false);
    }
  }, [state, storyboardId, t]);

  const handleSave = async () => {
    if (!state.savedCharacterId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const draft = characterNewWizardToAssetDraft(state);
      await registerCompletedGenerationInLibraryClient({
        generationType: "character",
        assetUrl: state.generatedImageUrl,
        storageKey: draft.referenceStorageKey,
        thumbnailUrl: state.generatedImageUrl,
        assetName: state.characterName,
        projectId: state.projectId,
        projectTitle: state.projectTitle,
        sourceModule: "wizard",
        backingId: state.savedCharacterId,
        sourceRoute: "new",
        characterCompleteness: state.engineSaveMetadata?.characterCompleteness,
        motionReadinessScore: state.engineSaveMetadata?.motionReadinessScore,
        motionReady: state.engineSaveMetadata?.motionReady,
        missingParts: state.engineSaveMetadata?.missingParts,
        characterType: state.engineSaveMetadata?.characterType,
      });
      trackCharacterClusterEvent("character_new", "completed");
      setState((prev) => ({ ...prev, step: "complete" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("characterCluster.error.save" as never));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioAuthGate>
      <main
        className={`mx-auto max-w-3xl px-4 py-8 ${studioVisual.pageBg}`}
        data-testid="character-new-guided-wizard"
        data-flow-id={dataFlowIdForCluster("character_new")}
      >
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#006D52]">
            {t("characterCluster.new.eyebrow" as never)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{t("characterCluster.new.title" as never)}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("characterCluster.new.subtitle" as never)}</p>
        </header>

        {state.step === "describe" || state.step === "analyze" ?
          <section className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-zinc-800">
              {t("characterCluster.new.describeLabel" as never)}
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                value={state.idea}
                onChange={(e) => setState((prev) => ({ ...prev, idea: e.target.value }))}
                placeholder={t("characterCluster.new.describePlaceholder" as never)}
              />
            </label>
            <button
              type="button"
              disabled={!state.idea.trim() || busy}
              onClick={handleAnalyze}
              className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("characterCluster.new.analyze" as never)}
            </button>
          </section>
        : null}

        {state.step === "questions" ?
          <section className="mt-6 space-y-4">
            {state.engineSummary ?
              <StudioCharacterAnalysisCard summary={state.engineSummary} />
            : null}
            <StudioCharacterDynamicQuestionsPanel
              questions={state.questions}
              answers={state.answers}
              onAnswersChange={(answers) => setState((prev) => ({ ...prev, answers }))}
            />
            <button
              type="button"
              disabled={!allCharacterDynamicQuestionsAnswered(state.questions, state.answers) || busy}
              onClick={() => void handleGenerate()}
              className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("characterCluster.new.generate" as never)}
            </button>
          </section>
        : null}

        {state.step === "generate" && busy ?
          <p className="mt-6 text-sm text-zinc-600">{t("characterCluster.new.generating" as never)}</p>
        : null}

        {state.step === "preview" ?
          <section className="mt-6 space-y-4" data-testid="character-new-preview">
            {state.generatedImageUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.generatedImageUrl} alt="" className="mx-auto max-h-80 rounded-xl border object-contain" />
            : null}
            <label className="block text-sm font-medium">
              {t("characterCluster.save.name" as never)}
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={state.characterName}
                onChange={(e) => setState((prev) => ({ ...prev, characterName: e.target.value }))}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  setState((prev) => ({ ...prev, previewApproved: true, step: "save" }));
                  void handleSave();
                }}
              >
                {t("characterCluster.preview.approve" as never)}
              </button>
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                onClick={() => void handleGenerate()}
              >
                {t("characterCluster.preview.regenerate" as never)}
              </button>
              <Link
                href="/studio/characters/new?advanced=1"
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                data-testid="character-new-advanced-editor"
              >
                {t("characterCluster.preview.advanced" as never)}
              </Link>
            </div>
          </section>
        : null}

        {state.step === "complete" ?
          <section className="mt-6 space-y-3" data-testid="character-new-complete">
            <p className="text-lg font-semibold text-emerald-800">{t("characterCluster.complete.title" as never)}</p>
            <div className="flex flex-wrap gap-2">
              {storyboardId ?
                <Link
                  href={studioWorkspaceHref(storyboardId)}
                  className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
                >
                  {t("characterCluster.complete.story" as never)}
                </Link>
              : null}
              <Link href="/studio/assets/creative/characters" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                {t("characterCluster.complete.library" as never)}
              </Link>
              <Link href="/studio/characters/new" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                {t("characterCluster.complete.another" as never)}
              </Link>
            </div>
          </section>
        : null}

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </main>
    </StudioAuthGate>
  );
}
