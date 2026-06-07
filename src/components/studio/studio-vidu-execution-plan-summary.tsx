"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildViduExecutionPlan } from "@/lib/studio-vidu-execution-planner";
import type { ViduExecutionPlan } from "@/types/studio-vidu-execution-plan";
import type { StudioToolId } from "@/lib/studio-tool-id";
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
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  styleProfile?: string;
  directorProfile?: string;
  plan?: ViduExecutionPlan;
  variant?: "full" | "compact";
  onSwitchTool?: (tool: StudioToolId) => void;
};

function readinessClass(passed: boolean): string {
  return passed ? "text-emerald-700" : "text-amber-800";
}

export function StudioViduExecutionPlanSummary({
  storyboard,
  characters = [],
  locations = [],
  props = [],
  worlds = [],
  projectMemory,
  styleProfile,
  directorProfile,
  plan: planProp,
  variant = "full",
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const plan = useMemo(
    () =>
      planProp ??
      buildViduExecutionPlan({
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

  const isCompact = variant === "compact";
  const missingImageCount = plan.missingRequirements.filter((m) => m.kind === "image").length;

  return (
    <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.executionPlan.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.executionPlan.subtitle")}</p>

      <p className="mt-3 text-sm font-semibold text-[#0067B1]">
        {t(plan.executionModeLabelKey as TranslationKey)}
      </p>
      <p className="mt-1 text-xs text-zinc-700">
        {t(plan.approachSummaryKey as TranslationKey)}
      </p>

      <div className={`mt-3 grid gap-2 ${isCompact ? "grid-cols-2" : "sm:grid-cols-3"}`}>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
          <span className="text-zinc-500">{t("studio.executionPlan.metric.jobs")}</span>
          <p className="font-semibold text-zinc-900">{plan.totalJobCount}</p>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
          <span className="text-zinc-500">{t("studio.executionPlan.metric.duration")}</span>
          <p className="font-semibold text-zinc-900">{plan.estimatedDurationSeconds}s</p>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
          <span className="text-zinc-500">{t("studio.executionPlan.metric.missingImages")}</span>
          <p className="font-semibold text-zinc-900">{missingImageCount}</p>
        </div>
      </div>

      {plan.usesMultipleSteps ?
        <p className="mt-2 text-xs text-zinc-700">
          {t("studio.executionPlan.multipleSteps")}
        </p>
      : null}

      <p className="mt-3 text-xs font-medium text-zinc-800">
        {plan.readiness.readyToRender
          ? t("studio.executionPlan.readyToRender")
          : t("studio.executionPlan.notReadyToRender")}
      </p>

      {!isCompact && plan.jobs.length > 0 ?
        <ul className="mt-3 space-y-2">
          {plan.jobs.slice(0, 6).map((job, index) => (
            <li key={job.id} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">
                {t("studio.executionPlan.jobLine", { index: String(index + 1) })}
              </span>
              {" · "}
              {job.durationSeconds}s
              {" · "}
              {job.inputImages.filter((img) => img.missing).length > 0
                ? t("studio.executionPlan.missingImages")
                : t("studio.executionPlan.imagesReady")}
            </li>
          ))}
        </ul>
      : null}

      {plan.missingRequirements.length > 0 ?
        <ul className="mt-3 space-y-1 text-xs text-amber-900">
          {plan.missingRequirements.slice(0, 4).map((item) => (
            <li key={item.id}>
              ⚠ {t(item.reasonKey as TranslationKey, item.reasonParams)}
            </li>
          ))}
        </ul>
      : null}

      {plan.fallbackPlan.active ?
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <p className="font-semibold">{t("studio.executionPlan.fallback.title")}</p>
          <p className="mt-1">
            {t(plan.fallbackPlan.reasonKey as TranslationKey, plan.fallbackPlan.reasonParams)}
          </p>
        </div>
      : null}

      {!isCompact ?
        <ul className="mt-3 space-y-1 text-xs text-zinc-700">
          {(
            [
              ["planPresent", plan.readiness.planPresent, "studio.executionPlan.readiness.planPresent"],
              ["readyToRender", plan.readiness.readyToRender, "studio.executionPlan.readiness.readyToRender"],
              [
                "missingStartEndImages",
                !plan.readiness.missingStartEndImages,
                "studio.executionPlan.readiness.startEndImages",
              ],
              [
                "actionStructure",
                !plan.readiness.unsupportedHybridPieces,
                "studio.executionPlan.readiness.hybridSupported",
              ],
            ] as const
          ).map(([id, passed, key]) => (
            <li key={id} className="flex items-center gap-2">
              <span className={readinessClass(passed)}>{passed ? "✓" : "○"}</span>
              {t(key as TranslationKey)}
            </li>
          ))}
        </ul>
      : null}

      {missingImageCount > 0 && onSwitchTool ?
        <button
          type="button"
          onClick={() => onSwitchTool("visual")}
          className="mt-3 text-[10px] font-semibold text-[#0067B1] hover:underline"
        >
          {t("studio.executionPlan.openVisual")}
        </button>
      : null}
    </section>
  );
}
