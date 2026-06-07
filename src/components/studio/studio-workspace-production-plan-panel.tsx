"use client";

import { StudioAnimationPlanSummary } from "@/components/studio/studio-animation-plan-summary";
import { StudioSceneGenerationPlanSummary } from "@/components/studio/studio-scene-generation-plan-summary";
import { StudioViduExecutionPlanSummary } from "@/components/studio/studio-vidu-execution-plan-summary";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import {
  buildStoryArchitectSummary,
  buildStoryArchitecture,
} from "@/lib/studio-story-architecture";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  ProductionStoryStructurePhase,
  StoryStructurePhaseStatus,
} from "@/types/studio-production-plan";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  styleProfile?: string;
  directorProfile?: string;
  onSwitchTool?: (tool: StudioToolId) => void;
};

function readinessClass(level: string): string {
  if (level === "ready") return "border-emerald-200 bg-emerald-50/70";
  if (level === "almost_ready") return "border-amber-200 bg-amber-50/70";
  return "border-red-200 bg-red-50/70";
}

function storyStatusKey(status: StoryStructurePhaseStatus): TranslationKey {
  if (status === "strong") return "studio.productionPlan.story.status.strong";
  if (status === "present") return "studio.productionPlan.story.status.present";
  if (status === "weak") return "studio.productionPlan.story.status.weak";
  return "studio.productionPlan.story.status.missing";
}

function storyStatusClass(status: StoryStructurePhaseStatus): string {
  if (status === "strong") return "text-[#006D52]";
  if (status === "present") return "text-[#0067B1]";
  if (status === "weak") return "text-amber-800";
  return "text-zinc-500";
}

function audioStatusKey(status: string): TranslationKey {
  if (status === "ready") return "studio.productionPlan.audio.ready";
  if (status === "partial") return "studio.productionPlan.audio.partial";
  return "studio.productionPlan.audio.missing";
}

function StoryPhaseRow({ phase }: { phase: ProductionStoryStructurePhase }) {
  const t = useActiveTranslator();
  return (
    <li className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs">
      <span className="font-medium text-zinc-800">{t(phase.labelKey as TranslationKey)}</span>
      <span className={`font-semibold ${storyStatusClass(phase.status)}`}>
        {t(storyStatusKey(phase.status))}
      </span>
    </li>
  );
}

export function StudioWorkspaceProductionPlanPanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  projectMemory,
  styleProfile,
  directorProfile,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const plan = useMemo(() => {
    const assetDecisionRegistry = loadAssetDecisionRegistry({ storyboardId: storyboard.id });
    return buildStudioProductionPlan({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      styleProfile,
      directorProfile,
      assetDecisionRegistry,
    });
  }, [storyboard, characters, locations, props, worlds, projectMemory, styleProfile, directorProfile]);

  const architectSummary = useMemo(() => {
    const assetDecisionRegistry = loadAssetDecisionRegistry({ storyboardId: storyboard.id });
    const architecture = buildStoryArchitecture({
      userIdea: storyboard.aiDirectorPrompt ?? "",
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      assetDecisionRegistry,
      styleProfile,
      directorProfile,
    });
    return buildStoryArchitectSummary(architecture);
  }, [storyboard, characters, locations, props, worlds, projectMemory, styleProfile, directorProfile]);

  const readinessLabelKey =
    plan.readiness === "ready"
      ? "studio.productionPlan.readiness.ready"
      : plan.readiness === "almost_ready"
        ? "studio.productionPlan.readiness.almostReady"
        : "studio.productionPlan.readiness.needsWork";

  return (
    <div className="space-y-4">
      <section className={`rounded-2xl border p-4 ${readinessClass(plan.readiness)}`}>
        <h2 className="text-base font-semibold text-zinc-900">
          {t("studio.productionPlan.title")}
        </h2>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.productionPlan.subtitle")}</p>
        <p className="mt-3 text-sm font-medium text-zinc-800">
          {t(plan.productionGoalKey as TranslationKey, plan.productionGoalParams)}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          {t(readinessLabelKey)} · {t("studio.productionPlan.readiness.score", { score: String(plan.readinessScore) })}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
            <span className="text-zinc-500">{t("studio.productionPlan.metric.duration")}</span>
            <p className="font-semibold text-zinc-900">{plan.estimatedDurationSeconds}s</p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
            <span className="text-zinc-500">{t("studio.productionPlan.metric.shots")}</span>
            <p className="font-semibold text-zinc-900">{plan.estimatedShotCount}</p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
            <span className="text-zinc-500">{t("studio.productionPlan.metric.scenes")}</span>
            <p className="font-semibold text-zinc-900">{plan.estimatedSceneCount}</p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
            <span className="text-zinc-500">{t("studio.productionPlan.metric.assets")}</span>
            <p className="font-semibold text-zinc-900">{plan.estimatedAssetCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.storyArchitect.summary.title")}
        </h3>
        <p className="mt-1 text-sm text-zinc-700">{architectSummary.storyGoal || "—"}</p>
        <p className="mt-2 text-xs text-indigo-900">
          {t(architectSummary.labelKey as TranslationKey, architectSummary.params)}
        </p>
        {onSwitchTool ?
          <button
            type="button"
            onClick={() => onSwitchTool("storyArchitecture")}
            className="mt-3 text-sm font-semibold text-[#0067B1] hover:underline"
          >
            {t("studio.storyArchitect.summary.open")}
          </button>
        : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.story.title")}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {plan.storyStructure.map((phase) => (
            <StoryPhaseRow key={phase.phase} phase={phase} />
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.assets.title")}
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["characters", plan.assetPlanning.characters],
              ["locations", plan.assetPlanning.locations],
              ["props", plan.assetPlanning.props],
              ["worlds", plan.assetPlanning.worlds],
            ] as const
          ).map(([key, entries]) => (
            <div key={key} className="rounded-lg bg-zinc-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {t(`studio.productionPlan.assets.${key}` as TranslationKey)}
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                {entries.filter((e) => e.status === "present").length}{" "}
                {t("studio.productionPlan.assets.present")}
                {entries.filter((e) => e.status === "missing").length > 0 ?
                  <>
                    {" · "}
                    {entries.filter((e) => e.status === "missing").length}{" "}
                    {t("studio.productionPlan.assets.missing")}
                  </>
                : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.action.title")}
        </h3>
        <p className="mt-1 text-xs text-zinc-700">
          {t("studio.productionPlan.action.summary", {
            actions: String(plan.actionPlanning.totalActionSteps),
            shots: String(plan.actionPlanning.recommendedShotCount),
            complexity: plan.actionPlanning.complexity,
          })}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.images.title")}
        </h3>
        <p className="mt-1 text-xs text-zinc-700">
          {t("studio.productionPlan.images.summary", {
            present: String(plan.imagePlanning.presentCount),
            required: String(plan.imagePlanning.requiredCount),
            missing: String(plan.imagePlanning.missingCount),
          })}
        </p>
        {plan.generationPlanning.missingRequiredCount > 0 ?
          <p className="mt-2 text-xs text-amber-800">
            {t("studio.generationPlan.production.beforeRender", {
              images: String(plan.generationPlanning.missingRequiredCount),
              assets: String(plan.generationPlanning.missingAssetCount),
            })}
          </p>
        : null}
      </section>

      <StudioSceneGenerationPlanSummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        compact
        onSwitchTool={onSwitchTool}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.audio.title")}
        </h3>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-xs text-zinc-700">
          {(
            [
              ["narration", plan.audioPlanning.narration],
              ["transcript", plan.audioPlanning.transcript],
              ["music", plan.audioPlanning.music],
              ["sound", plan.audioPlanning.sound],
            ] as const
          ).map(([key, status]) => (
            <li key={key} className="rounded-lg bg-zinc-50 px-3 py-2">
              {t(`studio.productionPlan.audio.${key}` as TranslationKey)}
              {" — "}
              {t(audioStatusKey(status))}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.render.title")}
        </h3>
        <p className="mt-1 text-sm font-semibold text-[#0067B1]">
          {t(plan.renderPlanning.strategyLabelKey as TranslationKey)}
        </p>
        <p className="mt-1 text-xs text-zinc-700">
          {t(plan.renderPlanning.strategyExplanationKey as TranslationKey)}
        </p>
      </section>

      <StudioAnimationPlanSummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />

      <StudioViduExecutionPlanSummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />

      {plan.creationGuidance.length > 0 ?
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.productionPlan.guidance.title")}
          </h3>
          <ul className="mt-2 space-y-2">
            {plan.creationGuidance.map((item) => (
              <li key={item.id} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-800">
                <p>{t(item.reasonKey as TranslationKey, item.reasonParams)}</p>
                {item.toolId && onSwitchTool ?
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSwitchTool(item.toolId!)}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold text-[#0067B1]"
                    >
                      {t("studio.productionPlan.guidance.openLibrary")}
                    </button>
                    {item.createNew ?
                      <button
                        type="button"
                        onClick={() => onSwitchTool(item.toolId!)}
                        className="rounded-full bg-[#0067B1] px-3 py-1 text-[10px] font-semibold text-white"
                      >
                        {t("studio.productionPlan.guidance.createNew")}
                      </button>
                    : null}
                  </div>
                : null}
              </li>
            ))}
          </ul>
        </section>
      : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionPlan.domain.title")}
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-zinc-700">
          {plan.domainReadiness.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className={d.passed ? "text-emerald-700" : "text-zinc-400"}>
                {d.passed ? "✓" : "○"}
              </span>
              {t(d.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
