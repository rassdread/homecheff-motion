"use client";

import { useCallback, useMemo, useState } from "react";
import { StudioTranscriptStatusLine } from "@/components/studio/studio-transcript-status-line";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import {
  applyProposalConsistencySuggestion,
} from "@/lib/studio-director-proposal-enrichment";
import { applyDirectorMemorySuggestion } from "@/lib/studio-director-proposal-memory";
import {
  applyDirectorProposal,
  resolveProposedSceneText,
} from "@/lib/studio-director-proposal-apply";
import { collectProposalSceneAssets } from "@/lib/studio-director-proposal-readiness";
import {
  StudioAiSuggestionCard,
  StudioFieldChangeRow,
} from "@/components/studio/studio-ai-suggestion-card";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  DirectorProposalApplyMode,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  canModify?: boolean;
  onApplied?: () => void | Promise<void>;
};

const EXAMPLE_KEYS = [
  "studio.directorProposal.example.homecheffGarden",
  "studio.directorProposal.example.affiliateAfrica",
  "studio.directorProposal.example.pixarChef",
  "studio.directorProposal.example.localDesigner",
  "studio.directorProposal.example.restaurantPromo",
] as const satisfies readonly TranslationKey[];

function collectUniqueAssets(proposal: StudioDirectorProposal) {
  const linked = collectProposalSceneAssets(proposal.scenes);
  const newCharacters: Array<{ name: string; reasonKey: string }> = [];
  const newLocations: Array<{ name: string; reasonKey: string }> = [];
  const newProps: Array<{ name: string; reasonKey: string }> = [];

  for (const scene of proposal.scenes) {
    for (const item of scene.proposedCharacters) {
      newCharacters.push({ name: item.name, reasonKey: item.reasonKey });
    }
    if (scene.proposedLocation) {
      newLocations.push({
        name: scene.proposedLocation.name,
        reasonKey: scene.proposedLocation.reasonKey,
      });
    }
    for (const item of scene.proposedProps) {
      newProps.push({ name: item.name, reasonKey: item.reasonKey });
    }
  }

  return {
    characters: linked.characters.map((c) => c.name),
    locations: linked.locations.map((l) => l.name),
    props: linked.props.map((p) => p.name),
    worlds: linked.worlds.map((w) => w.name),
    newCharacters,
    newLocations,
    newProps,
  };
}

function ReadinessCard({ proposal }: { proposal: StudioDirectorProposal }) {
  const t = useActiveTranslator();
  const { level, score, checks, recommendationKeys } = proposal.renderReadiness;
  const levelKey =
    level === "ready" ? "ready"
    : level === "almost_ready" ? "almostReady"
    : "needsWork";
  const cardClass =
    level === "ready" ? "border-emerald-200 bg-emerald-50/70"
    : level === "almost_ready" ? "border-amber-200 bg-amber-50/70"
    : "border-red-200 bg-red-50/70";

  return (
    <section className={`rounded-2xl border p-4 ${cardClass}`}>
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.directorProposal.readiness.title")}
      </h3>
      <p className="mt-1 text-xs font-medium text-zinc-700">
        {t("studio.directorProposal.readiness.score", { score: String(score) })}
        {" · "}
        {t(`studio.directorProposal.readiness.level.${levelKey}` as TranslationKey)}
      </p>
      <ul className="mt-3 space-y-1 text-xs text-zinc-700">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center gap-2">
            <span className={check.passed ? "text-emerald-700" : "text-zinc-400"}>
              {check.passed ? "✓" : "○"}
            </span>
            {t(check.messageKey as TranslationKey)}
          </li>
        ))}
      </ul>
      {recommendationKeys.length > 0 ?
        <ul className="mt-3 space-y-1 text-xs text-zinc-600">
          {recommendationKeys.map((key) => (
            <li key={key}>→ {t(key as TranslationKey)}</li>
          ))}
        </ul>
      : null}
    </section>
  );
}

function ProposalPreviewModal({
  proposal,
  busy,
  feedback,
  onClose,
  onApply,
  onRegenerate,
  onApplySuggestion,
  onApplyMemorySuggestion,
}: {
  proposal: StudioDirectorProposal;
  busy?: boolean;
  feedback?: string;
  onClose: () => void;
  onApply: (mode: DirectorProposalApplyMode) => void;
  onRegenerate: () => void;
  onApplySuggestion: (suggestionId: string) => void;
  onApplyMemorySuggestion: (suggestionId: string) => void;
}) {
  const t = useActiveTranslator();
  const assets = useMemo(() => collectUniqueAssets(proposal), [proposal]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-proposal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl">
        <header className="border-b border-zinc-100 px-4 py-4 sm:px-5">
          <h2 id="director-proposal-title" className="text-lg font-semibold text-zinc-900">
            {t("studio.directorProposal.preview.title")}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            {t("studio.directorProposal.preview.productionTitle")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("studio.directorProposal.preview.quality", {
              score: String(proposal.directorQualityScore),
            })}
          </p>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          <ReadinessCard proposal={proposal} />

          {proposal.storyHealthKeys && proposal.storyHealthKeys.length > 0 ?
            <section className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
                {t("studio.execution.recommendedReview")}
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-violet-950">
                {proposal.storyHealthKeys.map((key) => (
                  <li key={key}>→ {t(key as TranslationKey)}</li>
                ))}
              </ul>
            </section>
          : null}

          {proposal.fieldChanges && proposal.fieldChanges.length > 0 ?
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.changes")}
              </h3>
              {proposal.fieldChanges.map((change) => (
                <StudioFieldChangeRow
                  key={change.id}
                  fieldKey={change.fieldKey as TranslationKey}
                  fromLabel={change.fromLabel}
                  toLabel={change.toLabel}
                  sceneOrder={change.sceneOrder}
                />
              ))}
            </section>
          : null}

          {proposal.memorySuggestions && proposal.memorySuggestions.length > 0 ?
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                {t("studio.continuity.suggestedReuse")}
              </h3>
              {proposal.memorySuggestions.map((suggestion) => (
                <article
                  key={suggestion.id}
                  className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3"
                >
                  <p className="text-xs font-semibold text-zinc-900">
                    {t(suggestion.issueKey as TranslationKey)}
                  </p>
                  <ul className="mt-2 space-y-1 text-[10px] text-violet-950">
                    {suggestion.memoryBasisKeys.map((key, index) => (
                      <li key={key}>
                        → {t(key as TranslationKey, suggestion.memoryBasisParams?.[index])}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-zinc-700">
                    {t("studio.continuity.usage.series", {
                      storyboards: String(suggestion.usageStoryboardCount),
                      renders: String(suggestion.usageRenderCount),
                      campaigns: "0",
                    })}
                  </p>
                  {suggestion.proposedName ?
                    <p className="mt-1 text-xs text-zinc-600">
                      {t("studio.continuity.memory.newInstead", { name: suggestion.proposedName })}
                    </p>
                  : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestion.assetRef ?
                      <button
                        type="button"
                        onClick={() => onApplyMemorySuggestion(suggestion.id)}
                        className="min-h-9 rounded-full bg-[#0067B1] px-3 text-[11px] font-semibold text-white"
                      >
                        {t("studio.continuity.action.useExisting")}
                      </button>
                    : null}
                  </div>
                </article>
              ))}
            </section>
          : null}

          {proposal.consistencySuggestions && proposal.consistencySuggestions.length > 0 ?
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.execution.suggestedImprovements")}
              </h3>
              {proposal.consistencySuggestions.map((suggestion) => (
                <StudioAiSuggestionCard
                  key={suggestion.id}
                  titleKey="studio.execution.suggestedImprovement"
                  issueKey={suggestion.issueKey as TranslationKey}
                  reasonKey={suggestion.reasonKey as TranslationKey | undefined}
                  currentLabel={suggestion.currentLabel}
                  suggestedLabel={suggestion.suggestedLabel}
                  suggestedIsLabelKey={suggestion.suggestedLabel.startsWith("studio.")}
                  canApply={Boolean(suggestion.assetRef)}
                  onApply={() => onApplySuggestion(suggestion.id)}
                />
              ))}
            </section>
          : null}

          {proposal.identityConsumption?.rationales &&
          proposal.identityConsumption.rationales.length > 0 ?
            <section className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
                {t("studio.identityConsumption.directorTitle")}
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-700">
                {proposal.identityConsumption.rationales.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.sourceName}</span>
                    {" — "}
                    {t(r.reasonKey as TranslationKey, r.reasonParams)}
                  </li>
                ))}
              </ul>
            </section>
          : null}

          {proposal.renderStrategyPlan ?
            <section className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
                {t("studio.renderStrategy.recommendedApproach")}
              </h3>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {t(proposal.renderStrategyPlan.strategyLabelKey as TranslationKey)}
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                {t(proposal.renderStrategyPlan.strategyExplanationKey as TranslationKey)}
              </p>
              {proposal.renderStrategyPlan.reasons.length > 0 ?
                <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                  {proposal.renderStrategyPlan.reasons.slice(0, 3).map((r) => (
                    <li key={r.id}>{t(r.reasonKey as TranslationKey, r.reasonParams)}</li>
                  ))}
                </ul>
              : null}
            </section>
          : null}

          {proposal.generationPlanPreview && proposal.generationPlanPreview.length > 0 ?
            <section className="rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
                {t("studio.directorProposal.generationPlan.title")}
              </h3>
              <ol className="mt-2 space-y-1 text-xs text-zinc-700">
                {proposal.generationPlanPreview
                  .filter((row) => row.status !== "present")
                  .slice(0, 8)
                  .map((row) => (
                    <li key={`${row.sceneOrder}-${row.orderIndex}`}>
                      {t("studio.directorProposal.generationPlan.order", {
                        index: String(row.orderIndex),
                      })}
                      {" — "}
                      {row.actionBeat} · {t(row.roleLabelKey as TranslationKey)}
                      {row.status === "missing" ?
                        ` (${t("studio.directorProposal.generationPlan.missing")})`
                      : null}
                    </li>
                  ))}
              </ol>
            </section>
          : null}

          {proposal.actionShotDistribution && proposal.actionShotDistribution.length > 0 ?
            <section className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
                {t("studio.actionSequence.title")}
              </h3>
              <p className="mt-1 text-xs text-amber-900">
                {t("studio.actionSequence.reason.multipleShots")}
              </p>
              {proposal.actionShotDistribution.map((entry) => (
                <div key={entry.sceneOrder} className="mt-3 rounded-lg bg-white/90 p-3">
                  <p className="text-xs font-semibold text-zinc-900">
                    {t("studio.directorProposal.preview.sceneLine", {
                      index: String(entry.sceneOrder + 1),
                      title: entry.sceneTitle,
                    })}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {t("studio.actionSequence.recommendedShots", {
                      count: String(entry.recommendedShotCount),
                    })}
                  </p>
                  <ol className="mt-2 space-y-1 text-xs text-zinc-700">
                    {entry.beats.map((beat) => (
                      <li key={beat.order}>
                        {beat.order}. {t(beat.labelKey as TranslationKey)}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 text-[10px] text-amber-800">
                    {t(entry.durationAdviceKey as TranslationKey, entry.durationAdviceParams)}
                  </p>
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  className="rounded-full bg-[#0067B1]/40 px-3 py-1.5 text-xs font-semibold text-white"
                  title={t("studio.actionSequence.previewOnly")}
                >
                  {t("studio.actionSequence.useSuggestion")}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
                >
                  {t("studio.actionSequence.keepAsIs")}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">
                {t("studio.actionSequence.previewOnly")}
              </p>
            </section>
          : null}

          {proposal.animationPlanPreview && proposal.animationPlanPreview.length > 0 ?
            <section className="rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
                {t("studio.animationPlan.title")}
              </h3>
              <p className="mt-1 text-xs text-zinc-600">{t("studio.animationPlan.subtitle")}</p>
              {proposal.animationPlan ?
                <p className="mt-2 text-xs text-zinc-700">
                  {t("studio.animationPlan.speed.summary", {
                    provider: String(proposal.animationPlan.providerDurationEstimate),
                    final: String(proposal.animationPlan.finalDurationEstimate),
                  })}
                </p>
              : null}
              {proposal.animationPlanPreview.map((entry) => (
                <div key={entry.sceneOrder} className="mt-3 rounded-lg bg-white/90 p-3">
                  <p className="text-xs font-semibold text-zinc-900">
                    {t("studio.animationPlan.sceneLine", {
                      index: String(entry.sceneOrder + 1),
                      title: entry.sceneTitle,
                      duration: String(entry.targetDuration),
                    })}
                  </p>
                  <ol className="mt-2 space-y-1 text-xs text-zinc-700">
                    {entry.shots.map((shot, idx) => (
                      <li key={idx}>
                        <span className="tabular-nums text-zinc-500">
                          {shot.startTime.toFixed(0)}–{shot.endTime.toFixed(0)}s
                        </span>
                        {" · "}
                        {t(`studio.animationPlan.shotRole.${shot.shotRole}` as TranslationKey)}
                        {" · "}
                        {t(shot.motionIntentKey as TranslationKey)}
                        {shot.missingImage ?
                          <>
                            {" · "}
                            <span className="text-amber-800">
                              {t("studio.animationPlan.missingImage")}
                            </span>
                          </>
                        : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.directorProposal.preview.storyArc")}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              <li>{t(proposal.storyArc.beginningKey as TranslationKey, proposal.storyArc.topicParams)}</li>
              <li>{t(proposal.storyArc.middleKey as TranslationKey, proposal.storyArc.topicParams)}</li>
              <li>{t(proposal.storyArc.endKey as TranslationKey, proposal.storyArc.topicParams)}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.directorProposal.preview.scenes")}
            </h3>
            <ul className="mt-2 space-y-2">
              {proposal.scenes.map((scene) => {
                const copy = resolveProposedSceneText(scene, t);
                const assetNames = [
                  ...scene.characterRefs.map((c) => c.name),
                  scene.locationRef?.name,
                  ...scene.propRefs.map((p) => p.name),
                ].filter(Boolean);
                return (
                  <li
                    key={scene.tempId}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-zinc-900">
                      {t("studio.directorProposal.preview.sceneLine", {
                        index: String(scene.order + 1),
                        title: copy.title,
                      })}
                    </p>
                    <p className="text-zinc-600">{copy.description}</p>
                    <p className="mt-1 text-xs text-zinc-500">{copy.action}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {t("studio.directorProposal.preview.shotLine", {
                        shot: t(`studio.director.shot.${scene.shotType}` as TranslationKey),
                        movement: t(
                          `studio.director.movement.${scene.cameraMovement}` as TranslationKey
                        ),
                        energy: t(`studio.director.energy.${scene.sceneEnergy}` as TranslationKey),
                      })}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("studio.directorProposal.preview.emotionLine", {
                        emotion: scene.emotion,
                        duration: String(scene.durationSeconds),
                      })}
                    </p>
                    {assetNames.length > 0 ?
                      <p className="mt-1 text-xs text-[#0067B1]">
                        {t("studio.directorProposal.preview.sceneAssets")}: {assetNames.join(" · ")}
                      </p>
                    : null}
                    {scene.sceneAudio.musicCueType ?
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("studio.directorProposal.preview.audioLine", {
                          music: scene.sceneAudio.musicCueType,
                          sound: scene.sceneAudio.soundEnvironment || "—",
                        })}
                      </p>
                    : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <AssetList
              title={t("studio.directorProposal.preview.suggestedCharacters")}
              existing={assets.characters}
              proposed={assets.newCharacters}
            />
            <AssetList
              title={t("studio.directorProposal.preview.suggestedLocations")}
              existing={assets.locations}
              proposed={assets.newLocations}
            />
            <AssetList
              title={t("studio.directorProposal.preview.props")}
              existing={assets.props}
              proposed={assets.newProps}
            />
            {assets.worlds.length > 0 ?
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("studio.directorProposal.preview.worlds")}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {assets.worlds.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            : null}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.directorProposal.preview.suggestedVoices")}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              <li>
                {t("studio.directorProposal.preview.voice")}:{" "}
                {t(proposal.audio.voiceProfileLabelKey as TranslationKey)}
              </li>
              {proposal.voices.characterVoices.map((voice) => (
                <li key={voice.characterId}>
                  {voice.characterName} → {t(voice.voiceProfileLabelKey as TranslationKey)}
                  {" · "}
                  {t(`studio.directorProposal.voice.status.${voice.status}` as TranslationKey)}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.audioRecommendations")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {t(proposal.audio.musicProfileLabelKey as TranslationKey)} ·{" "}
                {proposal.audio.musicIntensity}
              </p>
              <p className="text-sm text-zinc-700">
                {t(proposal.audio.soundProfileLabelKey as TranslationKey)} ·{" "}
                {proposal.audio.soundDensity}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.camera")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {t(`studio.director.shot.${proposal.camera.dominantShotType}` as TranslationKey)} ·{" "}
                {t(
                  `studio.director.movement.${proposal.camera.dominantMovement}` as TranslationKey
                )}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.directorProposal.preview.textSuggestions")}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              <li>{t(proposal.text.openingHookKey as TranslationKey, proposal.text.openingHookParams)}</li>
              <li>{t(proposal.text.coreMessageKey as TranslationKey, proposal.text.coreMessageParams)}</li>
              <li>{t(proposal.text.ctaKey as TranslationKey, proposal.text.ctaParams)}</li>
              {proposal.text.sceneOverlays.map((overlay) => (
                <li key={`${overlay.sceneOrder}-${overlay.overlayKey}`} className="text-xs text-zinc-500">
                  Scène {overlay.sceneOrder + 1}:{" "}
                  {t(overlay.overlayKey as TranslationKey, overlay.overlayParams)}
                </li>
              ))}
            </ul>
            {proposal.text.narrationScriptPreview ?
              <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <p className="text-xs font-semibold text-zinc-600">
                  {t("studio.directorProposal.preview.narrationPreview")}
                </p>
                <p className="mt-1 line-clamp-4 text-xs text-zinc-700">
                  {proposal.text.narrationScriptPreview}
                </p>
              </div>
            : null}
            <p className="mt-2 text-xs text-zinc-500">
              {t("studio.directorProposal.preview.textPreviewOnly")}
            </p>
          </section>
        </div>

        {feedback ?
          <p className="border-t border-zinc-100 px-4 py-2 text-sm text-emerald-700 sm:px-5">{feedback}</p>
        : null}

        <footer className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:px-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("all")}
            className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("studio.directorProposal.apply.busy") : t("studio.directorProposal.apply.all")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("scenes")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.scenes")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("assets")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.assets")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("audio")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.audio")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("text")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.text")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRegenerate}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.regenerate")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.cancel")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function AssetList({
  title,
  existing,
  proposed,
}: {
  title: string;
  existing: string[];
  proposed: Array<{ name: string; reasonKey: string }>;
}) {
  const t = useActiveTranslator();
  if (existing.length === 0 && proposed.length === 0) {
    return null;
  }
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-zinc-700">
        {existing.map((name) => (
          <li key={`existing-${name}`}>
            {t("studio.directorProposal.preview.existingAsset", { name })}
          </li>
        ))}
        {proposed.map((item) => (
          <li key={`new-${item.name}`} className="text-amber-800">
            {t("studio.directorProposal.preview.newAsset", { name: item.name })}{" "}
            <span className="text-xs text-zinc-500">
              ({t("studio.directorProposal.preview.newAssetHint")})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudioDirectorProposalFlow({
  storyboard,
  characters,
  locations,
  props,
  worlds = [],
  projectMemory = null,
  canModify,
  onApplied,
}: Props) {
  const t = useActiveTranslator();
  const [idea, setIdea] = useState(storyboard.aiDirectorPrompt ?? "");
  const [proposal, setProposal] = useState<StudioDirectorProposal | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const assetDecisionRegistry = useMemo(
    () =>
      loadAssetDecisionRegistry({
        storyboardId: storyboard.id,
        briefIdea: storyboard.aiDirectorPrompt,
      }),
    [storyboard.id, storyboard.aiDirectorPrompt]
  );

  const handleGenerate = useCallback(() => {
    const productionPlan = buildStudioProductionPlan({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      assetDecisionRegistry,
    });
    const built = buildDirectorProposal({
      idea,
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      productionPlan,
      assetDecisionRegistry,
      t,
    });
    if (!built) {
      return;
    }
    setProposal(built);
    setPreviewOpen(true);
    setFeedback("");
  }, [idea, storyboard, characters, locations, props, worlds, projectMemory, assetDecisionRegistry, t]);

  const handleApplySuggestion = useCallback((suggestionId: string) => {
    setProposal((current) =>
      current ? applyProposalConsistencySuggestion(current, suggestionId) : current
    );
  }, []);

  const handleApplyMemorySuggestion = useCallback((suggestionId: string) => {
    setProposal((current) =>
      current ? applyDirectorMemorySuggestion(current, suggestionId) : current
    );
  }, []);

  const handleApply = useCallback(
    async (mode: DirectorProposalApplyMode) => {
      if (!canModify || !proposal) {
        return;
      }
      setBusy(true);
      setFeedback("");
      try {
        const result = await applyDirectorProposal({
          storyboardId: storyboard.id,
          proposal,
          mode,
          existingScenes: storyboard.scenes,
          t,
        });
        const messages = [t("studio.directorProposal.apply.success")];
        if (mode === "text") {
          messages.push(t("studio.directorProposal.apply.textPreviewNote"));
        }
        if (result.skippedNewAssets > 0) {
          messages.push(
            t("studio.directorProposal.apply.partialNewAssets", {
              count: String(result.skippedNewAssets),
            })
          );
        }
        setFeedback(messages.join(" "));
        if (result.ok) {
          await onApplied?.();
          if (mode !== "assets") {
            setPreviewOpen(false);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [canModify, onApplied, proposal, storyboard.id, storyboard.scenes, t]
  );

  return (
    <>
      <section className="mb-4 rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/5 to-[#006D52]/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          {t("studio.directorProposal.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.directorProposal.subtitle")}</p>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          disabled={!canModify || busy}
          rows={3}
          placeholder={t("studio.directorProposal.placeholder")}
          className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0067B1] focus:outline-none focus:ring-1 focus:ring-[#0067B1]"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:w-auto sm:py-1">
            {t("studio.directorProposal.examplesLabel")}
          </span>
          {EXAMPLE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={!canModify || busy}
              onClick={() => setIdea(t(key))}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-[#0067B1]/40 disabled:opacity-60"
            >
              {t(key)}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!canModify || busy || !idea.trim()}
          onClick={handleGenerate}
          className="mt-4 rounded-xl bg-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ?
            t("studio.directorProposal.generating")
          : t("studio.directorProposal.generate")}
        </button>

        {storyboard.voiceEnabled ?
          <div className="mt-3">
            <StudioTranscriptStatusLine
              storyboardId={storyboard.id}
              voiceEnabled={Boolean(storyboard.voiceEnabled)}
              language={(storyboard.voiceLanguage ?? "en").slice(0, 2)}
            />
          </div>
        : null}
      </section>

      {previewOpen && proposal ?
        <ProposalPreviewModal
          proposal={proposal}
          busy={busy}
          feedback={feedback}
          onClose={() => {
            setPreviewOpen(false);
            setFeedback("");
          }}
          onApply={(mode) => void handleApply(mode)}
          onRegenerate={() => {
            setFeedback("");
            handleGenerate();
          }}
          onApplySuggestion={handleApplySuggestion}
          onApplyMemorySuggestion={handleApplyMemorySuggestion}
        />
      : null}
    </>
  );
}
