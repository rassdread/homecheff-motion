"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantWizardPrefillBanner } from "@/components/assistant/assistant-wizard-prefill-banner";
import { useAssistantWizardPrefill } from "@/hooks/use-assistant-wizard-prefill";
import { applyAssistantPrefillToFromReference } from "@/lib/assistant-wizard-prefill-apply";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioCharacterAnalysisCard } from "@/components/studio/studio-character-analysis-card";
import { StudioCharacterDynamicQuestionsPanel } from "@/components/studio/studio-character-dynamic-questions-panel";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { postWizardImageUpload } from "@/lib/instant-image-upload-client";
import { analyzeAssetStyleDnaApi } from "@/lib/studio-asset-derivation-client";
import {
  dataFlowIdForCluster,
  trackCharacterClusterEvent,
} from "@/lib/character-cluster-analytics";
import { saveCharacterFromCluster } from "@/lib/character-cluster-save";
import {
  allCharacterDynamicQuestionsAnswered,
} from "@/lib/character-dynamic-questions";
import {
  applyReferenceModeToState,
  characterFromReferenceWizardToDraft,
  createEmptyFromReferenceWizardState,
  seedFromReferenceAnalysis,
  type CharacterFromReferenceWizardState,
} from "@/lib/character-from-reference-wizard";
import { attachCharacterToStoryboardScene } from "@/lib/studio-character-entry-actions";
import { fetchStudioCharacter } from "@/lib/studio-characters-client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { CharacterReferenceMode } from "@/types/character-cluster";

const MODES: CharacterReferenceMode[] = ["exact", "custom_variant", "new_character"];

type Props = {
  projectId?: string | null;
  projectTitle?: string | null;
  storyboardId?: string | null;
  sceneId?: string | null;
  requirementId?: string | null;
  returnTo?: string | null;
  seedImageUrl?: string | null;
  seedStorageKey?: string | null;
  seedName?: string | null;
  seedCharacterId?: string | null;
  initialMode?: CharacterReferenceMode | null;
};

export function StudioCharacterFromReferenceWizard({
  projectId,
  projectTitle,
  storyboardId,
  sceneId,
  requirementId,
  returnTo,
  seedImageUrl,
  seedStorageKey,
  seedName,
  seedCharacterId,
  initialMode,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const { prefill, hasPrefill, clearPrefill } = useAssistantWizardPrefill();
  const prefillAppliedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CharacterFromReferenceWizardState>(() =>
    createEmptyFromReferenceWizardState({
      projectId,
      projectTitle,
      storyboardId,
      seedImageUrl: seedImageUrl ?? undefined,
      seedStorageKey: seedStorageKey ?? undefined,
      seedName: seedName ?? undefined,
      seedCharacterId,
      initialMode: initialMode ?? undefined,
    })
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trackCharacterClusterEvent("character_reference", "started");
  }, []);

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) {
      return;
    }
    prefillAppliedRef.current = true;
    setState((prev) => applyAssistantPrefillToFromReference(prev, prefill));
  }, [prefill]);

  useEffect(() => {
    if (seedImageUrl || !seedCharacterId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchStudioCharacter(seedCharacterId);
      if (cancelled || !res.ok) {
        return;
      }
      const character = res.data.character;
      const imageUrl = character.referenceImageUrl?.trim();
      if (!imageUrl) {
        return;
      }
      setState((prev) => ({
        ...prev,
        sourceReferenceImageUrl: imageUrl,
        sourceReferenceStorageKey: character.referenceStorageKey ?? "",
        sourceReferenceName: character.name,
        characterName: character.name,
        uploadSaved: true,
        step: "analyze",
        visionStatus: "loading",
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [seedCharacterId, seedImageUrl]);

  const runVision = useCallback(
    async (url: string) => {
      setBusy(true);
      setError("");
      setState((prev) => ({ ...prev, visionStatus: "loading", step: "analyze" }));
      const res = await analyzeAssetStyleDnaApi({
        imageUrl: url,
        sourceKind: "character",
        sourceName: state.characterName || "upload",
        derivationJobId: crypto.randomUUID(),
      });
      setBusy(false);
      if (!res.ok) {
        setState((prev) => ({
          ...prev,
          visionStatus: "failed",
          visionError: (res.data as { error?: string }).error ?? t("characterCluster.error.analysis" as never),
          step: "upload",
        }));
        return;
      }
      setState((prev) =>
        seedFromReferenceAnalysis(prev, res.data.visionAnalysis, locale === "nl" ? "nl" : "en")
      );
    },
    [locale, state.characterName, t]
  );

  useEffect(() => {
    if (state.step !== "analyze" || state.visionStatus !== "loading" || state.visionAnalysis) {
      return;
    }
    const url = state.sourceReferenceImageUrl.trim();
    if (url) {
      void runVision(url);
    }
  }, [
    state.step,
    state.visionStatus,
    state.visionAnalysis,
    state.sourceReferenceImageUrl,
    runVision,
  ]);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await postWizardImageUpload(formData);
      const name = file.name.replace(/\.[^.]+$/, "");
      setState((prev) => ({
        ...prev,
        sourceReferenceImageUrl: uploaded.workingImageUrl,
        sourceReferenceStorageKey: uploaded.workingStorageKey,
        sourceReferenceName: name,
        uploadSaved: true,
        characterName: name,
      }));
      await runVision(uploaded.workingImageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("characterCluster.error.upload" as never));
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    setState((prev) => ({ ...prev, step: "generate" }));
    const draft = characterFromReferenceWizardToDraft(state);
    try {
      const result = await saveCharacterFromCluster({
        draft,
        route: "from-reference",
        storyboardId,
        projectId: state.projectId,
        projectTitle: state.projectTitle,
        characterName: state.characterName,
        isMascot: draft.identityAssetType === "mascot",
        engineMetadata: state.engineSaveMetadata,
        onProgress: () => undefined,
      });
      trackCharacterClusterEvent("character_reference", "completed");
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
        generatedImageUrl: result.imageUrl,
        generatedStorageKey: draft.referenceStorageKey,
        savedCharacterId: result.characterId,
        step: "complete",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("characterCluster.error.generate" as never));
      setState((prev) => ({ ...prev, step: "preview" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioAuthGate>
      <main
        className={`mx-auto max-w-3xl px-4 py-8 ${studioVisual.pageBg}`}
        data-testid="character-from-reference-wizard"
        data-flow-id={dataFlowIdForCluster("character_reference")}
      >
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0067B1]">
            {t("characterCluster.reference.eyebrow" as never)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{t("characterCluster.reference.title" as never)}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("characterCluster.reference.subtitle" as never)}</p>
        </header>

        {hasPrefill && prefill ? (
          <div className="mt-4">
            <AssistantWizardPrefillBanner
              prefill={prefill}
              onClear={clearPrefill}
              onAdjust={() => fileRef.current?.click()}
            />
          </div>
        ) : null}

        {state.step === "upload" ?
          <section className="mt-6">
            <p className="text-sm text-zinc-700">{t("characterCluster.reference.uploadLead" as never)}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="mt-3 rounded-xl bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
            >
              {t("characterCluster.reference.upload" as never)}
            </button>
          </section>
        : null}

        {state.step === "analyze" && busy ?
          <p className="mt-6 text-sm text-zinc-600">{t("characterCluster.reference.analyzing" as never)}</p>
        : null}

        {state.engineSummary && (state.step === "findings" || state.step === "mode" || state.step === "questions") ?
          <div className="mt-6">
            <StudioCharacterAnalysisCard
              summary={state.engineSummary}
              showContinue={state.step === "findings"}
              onContinue={() => setState((prev) => ({ ...prev, step: "mode" }))}
            />
          </div>
        : null}

        {state.step === "mode" ?
          <section className="mt-4 space-y-2">
            <p className="text-sm font-semibold">{t("characterCluster.reference.modeTitle" as never)}</p>
            {MODES.map((mode) => (
              <label key={mode} className="flex cursor-pointer items-start gap-2 rounded-lg border bg-white p-3">
                <input
                  type="radio"
                  name="referenceMode"
                  checked={state.referenceMode === mode}
                  onChange={() =>
                    setState((prev) =>
                      applyReferenceModeToState(prev, mode, locale === "nl" ? "nl" : "en")
                    )
                  }
                />
                <span>
                  <span className="text-sm font-medium">{t(`characterCluster.reference.mode.${mode}` as never)}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {t(`characterCluster.reference.mode.${mode}Hint` as never)}
                  </span>
                </span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, step: "questions" }))}
              className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
            >
              {t("characterCluster.continue" as never)}
            </button>
          </section>
        : null}

        {state.step === "questions" ?
          <section className="mt-4 space-y-4">
            <StudioCharacterDynamicQuestionsPanel
              questions={state.questions}
              answers={state.answers}
              onAnswersChange={(answers) => setState((prev) => ({ ...prev, answers }))}
            />
            <button
              type="button"
              disabled={!allCharacterDynamicQuestionsAnswered(state.questions, state.answers) || busy}
              onClick={() => {
                setState((prev) => ({ ...prev, step: "preview" }));
              }}
              className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("characterCluster.reference.preview" as never)}
            </button>
          </section>
        : null}

        {state.step === "preview" ?
          <section className="mt-4 space-y-3" data-testid="character-reference-preview">
            {state.sourceReferenceImageUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.sourceReferenceImageUrl} alt="" className="mx-auto max-h-64 rounded-xl border object-contain" />
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
                disabled={busy}
                onClick={() => void handleGenerate()}
                className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
              >
                {t("characterCluster.reference.generate" as never)}
              </button>
              <Link
                href="/studio/characters/new?advanced=1"
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                data-testid="character-reference-advanced-editor"
              >
                {t("characterCluster.preview.advanced" as never)}
              </Link>
            </div>
          </section>
        : null}

        {state.step === "generate" && busy ?
          <p className="mt-6 text-sm text-zinc-600">{t("characterCluster.reference.generating" as never)}</p>
        : null}

        {state.step === "complete" ?
          <section className="mt-6 space-y-3" data-testid="character-reference-complete">
            <p className="text-lg font-semibold text-emerald-800">{t("characterCluster.complete.title" as never)}</p>
            {state.generatedImageUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.generatedImageUrl} alt="" className="mx-auto max-h-64 rounded-xl border object-contain" />
            : null}
            <div className="flex flex-wrap gap-2">
              {storyboardId ?
                <Link href={studioWorkspaceHref(storyboardId)} className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white">
                  {t("characterCluster.complete.story" as never)}
                </Link>
              : null}
              <Link href="/studio/assets/creative/characters" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                {t("characterCluster.complete.library" as never)}
              </Link>
              <Link href="/studio/characters/from-reference" className="rounded-xl border px-4 py-2 text-sm font-semibold">
                {t("characterCluster.complete.another" as never)}
              </Link>
            </div>
          </section>
        : null}

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {state.visionError ? <p className="mt-3 text-sm text-red-700">{state.visionError}</p> : null}
      </main>
    </StudioAuthGate>
  );
}
