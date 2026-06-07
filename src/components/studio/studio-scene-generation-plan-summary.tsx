"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioSceneGenerationPlan } from "@/types/studio-scene-generation-plan";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  styleProfile?: string;
  directorProfile?: string;
  plan?: StudioSceneGenerationPlan;
  compact?: boolean;
  onSwitchTool?: (tool: StudioToolId) => void;
};

function readinessClass(level: string): string {
  if (level === "ready") return "border-emerald-200 bg-emerald-50/70";
  if (level === "almost_ready") return "border-amber-200 bg-amber-50/70";
  return "border-red-200 bg-red-50/50";
}

function statusIcon(status: string): string {
  if (status === "present") return "✓";
  if (status === "blocked") return "—";
  return "!";
}

export function StudioSceneGenerationPlanSummary({
  storyboard,
  characters = [],
  locations = [],
  props = [],
  worlds = [],
  projectMemory,
  styleProfile,
  directorProfile,
  plan: planProp,
  compact = false,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const plan = useMemo(
    () =>
      planProp ??
      buildSceneGenerationPlan({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        projectMemory: projectMemory ?? undefined,
        styleProfile,
        directorProfile,
      }),
    [
      planProp,
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory,
      styleProfile,
      directorProfile,
    ]
  );

  const missingRequired = plan.requiredImages.filter((i) => i.status !== "present");
  const missingRecommended = plan.recommendedImages.filter((i) => i.status !== "present");

  return (
    <section className={`rounded-2xl border p-4 ${readinessClass(plan.readiness.level)}`}>
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.generationPlan.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-700">{t(plan.guidanceKey as TranslationKey, plan.guidanceParams)}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-lg bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-800">{t("studio.generationPlan.required.title")}</p>
          <p className="mt-1 text-zinc-600">
            {t("studio.generationPlan.countSummary", {
              present: String(plan.requiredImages.filter((i) => i.status === "present").length),
              total: String(plan.totalRequired),
            })}
          </p>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-800">{t("studio.generationPlan.recommended.title")}</p>
          <p className="mt-1 text-zinc-600">
            {t("studio.generationPlan.countSummary", {
              present: String(plan.recommendedImages.filter((i) => i.status === "present").length),
              total: String(plan.totalRecommended),
            })}
          </p>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-800">{t("studio.generationPlan.renderStatus.title")}</p>
          <p className="mt-1 font-medium text-zinc-800">
            {plan.readiness.readyToRender
              ? t("studio.generationPlan.renderStatus.ready")
              : plan.readiness.level === "almost_ready"
                ? t("studio.generationPlan.renderStatus.almostReady")
                : t("studio.generationPlan.renderStatus.needsImages")}
          </p>
        </div>
      </div>

      {!compact && plan.generationSteps.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-zinc-800">{t("studio.generationPlan.order.title")}</p>
          <ol className="mt-2 space-y-1.5">
            {plan.generationSteps.map((step) => (
              <li key={step.order} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-700">
                {step.order}. {t(step.summaryKey as TranslationKey, step.summaryParams)}
              </li>
            ))}
          </ol>
        </div>
      : null}

      {!compact && missingRequired.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-zinc-800">{t("studio.generationPlan.required.missingList")}</p>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
            {missingRequired.slice(0, 8).map((item) => (
              <li key={item.id} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-800">
                <span className="font-semibold text-amber-800" aria-hidden>
                  {statusIcon(item.status)}{" "}
                </span>
                {item.sceneOrder + 1}. {item.actionBeat || item.sceneTitle}
                {" · "}
                {t(item.roleLabelKey as TranslationKey)}
                {item.assetDependencies.some((d) => d.status === "missing") ?
                  <p className="mt-1 text-[10px] text-amber-800">
                    {t("studio.generationPlan.dependency.needsFirst")}
                    {" "}
                    {item.assetDependencies
                      .filter((d) => d.status === "missing")
                      .map((d) => d.name || t(d.labelKey as TranslationKey))
                      .join(", ")}
                  </p>
                : null}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {!compact && missingRecommended.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-zinc-700">{t("studio.generationPlan.recommended.missingList")}</p>
          <ul className="mt-1 space-y-1 text-xs text-zinc-600">
            {missingRecommended.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.sceneOrder + 1}. {item.actionBeat || item.sceneTitle} —{" "}
                {t(item.roleLabelKey as TranslationKey)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {!compact && plan.missingAssets.length > 0 ?
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
          <p className="text-xs font-semibold text-amber-950">{t("studio.generationPlan.missingAssets.title")}</p>
          <ul className="mt-1 space-y-1 text-xs text-amber-900">
            {plan.missingAssets.slice(0, 4).map((asset) => (
              <li key={asset.id}>{t(asset.reasonKey as TranslationKey, asset.reasonParams)}</li>
            ))}
          </ul>
        </div>
      : null}

      {onSwitchTool ?
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
            onClick={() => onSwitchTool("visual")}
          >
            {t("studio.generationPlan.action.openVisual")}
          </button>
          <button
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
            onClick={() => onSwitchTool("characters")}
          >
            {t("studio.generationPlan.action.openLibrary")}
          </button>
        </div>
      : null}
    </section>
  );
}
