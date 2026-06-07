"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioSceneImagePanel } from "@/components/studio/studio-scene-image-panel";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildSceneImageReadiness,
  buildVisualProductionSummary,
  enrichVisualProductionSummary,
  findSceneVisualPlan,
} from "@/lib/studio-visual-production-summary";
import { buildCurrentStoryboardShotPlan } from "@/lib/studio-shot-planner";
import { buildVisualProductionAssetGaps } from "@/lib/studio-asset-evolution";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import { StudioAiSuggestionCard } from "@/components/studio/studio-ai-suggestion-card";
import { StudioIdentityConsumptionSummary } from "@/components/studio/studio-identity-consumption-summary";
import { StudioRenderStrategySummary } from "@/components/studio/studio-render-strategy-summary";
import { StudioCharacterCapabilitiesSummary } from "@/components/studio/studio-character-capabilities-summary";
import { StudioSceneGenerationPlanSummary } from "@/components/studio/studio-scene-generation-plan-summary";
import { StudioActionSequenceSummary } from "@/components/studio/studio-action-sequence-summary";
import { bulkGenerateStudioSceneImagesApi } from "@/lib/studio-scene-images-client";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type { StudioSceneDetail, StudioStoryboardDetail, StudioCharacterListItem, StudioLocationListItem, StudioPropListItem, StudioWorldProfileListItem } from "@/types/studio-api";

type Props = {
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  onRefreshStoryboard?: () => void | Promise<void>;
  onSwitchTool?: (tool: StudioToolId) => void;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
};

function levelCardClass(level: string): string {
  if (level === "ready") {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (level === "almost_ready") {
    return "border-amber-200 bg-amber-50/70";
  }
  return "border-red-200 bg-red-50/70";
}

function levelLabelKey(level: string): TranslationKey {
  if (level === "ready") {
    return "studio.visualProduction.readiness.level.ready";
  }
  if (level === "almost_ready") {
    return "studio.visualProduction.readiness.level.almostReady";
  }
  return "studio.visualProduction.readiness.level.needsWork";
}

export function StudioWorkspaceVisualProductionPanel({
  storyboardId,
  storyboard,
  activeScene,
  activeSceneIndex,
  styleProfile,
  directorProfile,
  canModify,
  onSceneUpdated,
  onRefreshStoryboard,
  onSwitchTool,
  characters = [],
  locations = [],
  props = [],
  worlds = [],
}: Props) {
  const t = useActiveTranslator();
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [promptDraft, setPromptDraft] = useState("");

  const summary = useMemo(
    () =>
      enrichVisualProductionSummary(
        buildVisualProductionSummary(storyboard),
        storyboard,
        styleProfile,
        directorProfile
      ),
    [storyboard, styleProfile, directorProfile]
  );

  const readiness = useMemo(
    () =>
      buildSceneImageReadiness({
        storyboard,
        styleProfile,
        directorProfile,
        characters,
        locations,
        props,
        worlds,
      }),
    [storyboard, styleProfile, directorProfile, characters, locations, props, worlds]
  );

  const scenePlan = useMemo(() => {
    if (!activeScene) {
      return null;
    }
    return findSceneVisualPlan(storyboard, activeScene.id, styleProfile, directorProfile);
  }, [storyboard, activeScene, styleProfile, directorProfile]);

  const shotPlan = useMemo(
    () => buildCurrentStoryboardShotPlan(storyboard),
    [storyboard]
  );

  const totalPacingSeconds = useMemo(
    () => shotPlan.pacingSeconds.reduce((sum, seconds) => sum + seconds, 0),
    [shotPlan.pacingSeconds]
  );

  const visualAssetGaps = useMemo(
    () => buildVisualProductionAssetGaps(storyboard),
    [storyboard]
  );

  const visualFixes = useMemo(
    () =>
      buildStudioUnifiedReadiness({
        storyboard,
        styleProfile,
        directorProfile,
        characters,
        locations,
        props,
        worlds,
      }).fixes.filter((f) =>
        ["location", "world", "characters", "camera", "images"].includes(f.checkId)
      ),
    [storyboard, styleProfile, directorProfile, characters, locations, props, worlds]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPromptDraft(scenePlan?.exports.imageGenerationPrompt ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scenePlan?.exports.imageGenerationPrompt, activeScene?.id]);

  const handleBulkGenerate = useCallback(async () => {
    if (!canModify) {
      return;
    }
    setBulkBusy(true);
    setBulkFeedback("");
    const res = await bulkGenerateStudioSceneImagesApi(storyboardId);
    setBulkBusy(false);
    if (!res.ok) {
      setBulkFeedback(
        (res.data as { error?: string }).error ?? t("studio.visualProduction.error.bulkFailed")
      );
      return;
    }
    const ok = res.data.results.filter((r) => r.ok).length;
    const total = res.data.results.length;
    setBulkFeedback(t("studio.visualProduction.bulkDone", { ok: String(ok), total: String(total) }));
    await onRefreshStoryboard?.();
  }, [canModify, onRefreshStoryboard, storyboardId, t]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.visual")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.visual.hint")}</p>
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
        <h3 className="text-sm font-semibold text-indigo-950">
          {t("studio.visualProduction.overview.title")}
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.visualProduction.overview.scenesReady")}
            </dt>
            <dd className="mt-1 text-lg font-bold text-emerald-700">{summary.scenesWithImage}</dd>
          </div>
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.visualProduction.overview.scenesMissingImage")}
            </dt>
            <dd className="mt-1 text-lg font-bold text-amber-700">{summary.scenesWithoutImage}</dd>
          </div>
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.visualProduction.overview.scenesMissingLocation")}
            </dt>
            <dd className="mt-1 text-lg font-bold text-zinc-800">{summary.scenesMissingLocation}</dd>
          </div>
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.visualProduction.overview.scenesMissingCharacters")}
            </dt>
            <dd className="mt-1 text-lg font-bold text-zinc-800">{summary.scenesMissingCharacters}</dd>
          </div>
        </dl>
        {summary.visualConsistencyScore > 0 ?
          <p className="mt-3 text-xs text-indigo-900">
            {t("studio.visualProduction.overview.consistency", {
              score: String(summary.visualConsistencyScore),
            })}
          </p>
        : null}
      </section>

      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <h3 className="text-sm font-semibold text-sky-950">
          {t("studio.shotPlanner.flowTitle")}
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.shotPlanner.cameraFlow")}
            </dt>
            <dd className="mt-1 text-xs text-zinc-800">
              {shotPlan.cameraFlow.length === 0
                ? t("studio.shotPlanner.flowEmpty")
                : shotPlan.cameraFlow
                    .map(
                      (row) =>
                        `${row.order + 1}: ${t(`studio.director.shot.${row.shotType}` as TranslationKey)}`
                    )
                    .join(" → ")}
            </dd>
          </div>
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.shotPlanner.shotFlow")}
            </dt>
            <dd className="mt-1 text-xs text-zinc-800">
              {t("studio.shotPlanner.diversityScore", {
                score: String(shotPlan.shotDiversityScore),
              })}
            </dd>
          </div>
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.shotPlanner.scenePacing")}
            </dt>
            <dd className="mt-1 text-xs text-zinc-800">
              {shotPlan.pacingSeconds.length === 0
                ? t("studio.shotPlanner.flowEmpty")
                : t("studio.shotPlanner.pacingTotal", {
                    seconds: String(totalPacingSeconds),
                    scenes: String(shotPlan.pacingSeconds.length),
                  })}
            </dd>
          </div>
          <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.shotPlanner.motionFlow")}
            </dt>
            <dd className="mt-1 text-xs text-zinc-800">
              {shotPlan.motionProgression.length === 0
                ? t("studio.shotPlanner.flowEmpty")
                : shotPlan.motionProgression
                    .map(
                      (row) =>
                        `${row.order + 1}: ${t(`studio.director.movement.${row.movement}` as TranslationKey)}`
                    )
                    .join(" → ")}
            </dd>
          </div>
        </dl>
      </section>

      {visualAssetGaps.length > 0 ?
        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.assetEvolution.visual.title")}
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {visualAssetGaps.map((gap) => (
              <li key={`${gap.code}-${gap.sceneOrders[0]}`}>
                → {t(gap.messageKey as TranslationKey, {
                  scene: String((gap.sceneOrders[0] ?? 0) + 1),
                })}
              </li>
            ))}
          </ul>
        </section>
      : null}

      <section className={`rounded-2xl border p-4 ${levelCardClass(readiness.level)}`}>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.visualProduction.readiness.title")}
        </h3>
        <p className="mt-1 text-xs font-medium text-zinc-700">
          {t("studio.visualProduction.readiness.score", { score: String(readiness.score) })}
          {" · "}
          {t(levelLabelKey(readiness.level))}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-700">
          {readiness.checks.map((check) => (
            <li key={check.id} className="flex items-center gap-2">
              <span className={check.passed ? "text-emerald-700" : "text-zinc-400"}>
                {check.passed ? "✓" : "○"}
              </span>
              {t(check.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
        {readiness.recommendationKeys.length > 0 ?
          <ul className="mt-3 space-y-1 text-xs text-zinc-600">
            {readiness.recommendationKeys.map((key) => (
              <li key={key}>→ {t(key as TranslationKey)}</li>
            ))}
          </ul>
        : null}
      </section>

      <StudioSceneGenerationPlanSummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />

      <StudioIdentityConsumptionSummary
        storyboard={storyboard}
        libraries={{ characters, locations, props, worlds }}
        variant="full"
      />

      <StudioRenderStrategySummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        variant="compact"
        showShotSplit={false}
      />

      <StudioCharacterCapabilitiesSummary
        storyboard={storyboard}
        scene={activeScene}
        characters={characters}
        props={props}
        worlds={worlds}
        variant="full"
      />

      <StudioActionSequenceSummary
        storyboard={storyboard}
        scene={activeScene}
        characters={characters}
        props={props}
        worlds={worlds}
        variant="full"
      />

      {visualFixes.length > 0 ?
        <section className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.execution.suggestedImprovements")}
          </h3>
          <p className="text-xs text-amber-900">{t("studio.execution.visualPreGenerateHint")}</p>
          {visualFixes.slice(0, 4).map((fix) => (
            <StudioAiSuggestionCard
              key={fix.id}
              titleKey="studio.execution.suggestedImprovement"
              issueKey={fix.issueKey as TranslationKey}
              reasonKey={fix.reasonKey as TranslationKey | undefined}
              currentLabel={fix.currentLabel}
              suggestedLabel={fix.suggestedLabel}
              suggestedIsLabelKey={fix.suggestedLabel.startsWith("studio.")}
              onOpen={onSwitchTool ? () => onSwitchTool(fix.tool) : undefined}
            />
          ))}
        </section>
      : null}

      {canModify ?
        <div className="flex flex-wrap gap-2">
          {activeScene ?
            <p className="w-full text-xs text-zinc-500">
              {t("studio.visualProduction.activeScene", { n: String(activeSceneIndex + 1) })}
            </p>
          : null}
          <button
            type="button"
            disabled={bulkBusy || summary.sceneCount === 0}
            onClick={() => void handleBulkGenerate()}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {bulkBusy ?
              t("studio.sceneImage.bulkGenerating")
            : t("studio.visualProduction.generateAll")}
          </button>
        </div>
      : null}

      {bulkFeedback ?
        <p className="text-sm text-zinc-700">{bulkFeedback}</p>
      : null}

      {!activeScene ?
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-600">
          {t("studio.visualProduction.noScene")}
        </p>
      : (
        <>
          {scenePlan ?
            <section className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
              <h3 className="text-sm font-semibold text-violet-950">
                {t("studio.visualProduction.concept.title")}
              </h3>
              <p className="mt-1 text-xs text-violet-800">{t("studio.visualProduction.concept.hint")}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.visualProduction.concept.characters")}
                  </dt>
                  <dd className="text-zinc-800">
                    {scenePlan.requirements.characterNames.join(", ") ||
                      t("studio.visualProduction.concept.none")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.visualProduction.concept.location")}
                  </dt>
                  <dd className="text-zinc-800">
                    {scenePlan.requirements.locationName ?? t("studio.visualProduction.concept.none")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.visualProduction.concept.camera")}
                  </dt>
                  <dd className="text-zinc-800">{scenePlan.requirements.cameraFraming}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.visualProduction.concept.mood")}
                  </dt>
                  <dd className="text-zinc-800">{scenePlan.requirements.visualMood}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.visualProduction.concept.lighting")}
                  </dt>
                  <dd className="text-zinc-800">{scenePlan.requirements.timeOfDay}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.visualProduction.concept.style")}
                  </dt>
                  <dd className="text-zinc-800">{scenePlan.aiSceneDescription}</dd>
                </div>
              </dl>
              {scenePlan.requirements.objectNames.length > 0 ?
                <p className="mt-2 text-xs text-zinc-600">
                  {t("studio.visualProduction.concept.props")}:{" "}
                  {scenePlan.requirements.objectNames.join(", ")}
                </p>
              : null}

              <label className="mt-4 block text-xs font-semibold text-violet-900">
                {t("studio.visualProduction.promptLabel")}
                <textarea
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-800"
                />
              </label>
              <p className="mt-1 text-[10px] text-zinc-500">
                {t("studio.visualProduction.promptHint")}
              </p>
              {onSwitchTool ?
                <button
                  type="button"
                  onClick={() => onSwitchTool("story")}
                  className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
                >
                  {t("studio.visualProduction.editInStory")}
                </button>
              : null}
            </section>
          : null}

          <StudioSceneImagePanel
            storyboardId={storyboardId}
            scene={activeScene}
            styleProfile={styleProfile}
            canModify={canModify}
            onSceneUpdated={onSceneUpdated}
            autoSelectImprovedImage={storyboard.autoSelectImprovedImage ?? true}
          />
        </>
      )}
    </div>
  );
}
