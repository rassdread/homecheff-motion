"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildStudioAnimationPlan } from "@/lib/studio-animation-planner";
import type { StudioAnimationPlan } from "@/types/studio-animation-plan";
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
  plan?: StudioAnimationPlan;
  variant?: "full" | "compact";
  onSwitchTool?: (tool: StudioToolId) => void;
};

function readinessClass(passed: boolean): string {
  return passed ? "text-emerald-700" : "text-amber-800";
}

export function StudioAnimationPlanSummary({
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
      buildStudioAnimationPlan({
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

  return (
    <section className="rounded-2xl border border-[#006D52]/20 bg-[#006D52]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.animationPlan.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.animationPlan.subtitle")}</p>

      <div className={`mt-3 grid gap-2 ${isCompact ? "grid-cols-2" : "sm:grid-cols-4"}`}>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
          <span className="text-zinc-500">{t("studio.animationPlan.metric.duration")}</span>
          <p className="font-semibold text-zinc-900">{plan.totalTargetDuration}s</p>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
          <span className="text-zinc-500">{t("studio.animationPlan.metric.shots")}</span>
          <p className="font-semibold text-zinc-900">{plan.totalShotCount}</p>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
          <span className="text-zinc-500">{t("studio.animationPlan.metric.missingImages")}</span>
          <p className="font-semibold text-zinc-900">{plan.missingImageCount}</p>
        </div>
        {!isCompact ?
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs">
            <span className="text-zinc-500">{t("studio.animationPlan.metric.recommendedEdit")}</span>
            <p className="font-semibold text-zinc-900">{plan.finalDurationEstimate}s</p>
          </div>
        : null}
      </div>

      {plan.speedAdvice.suggestedSpeedAdjustment ?
        <p className="mt-3 text-xs text-zinc-700">
          {t(plan.speedAdvice.speedSummaryKey as TranslationKey, plan.speedAdvice.speedSummaryParams)}
          {" · "}
          {t(plan.speedAdvice.speedLabelKey as TranslationKey, {
            speed: plan.speedAdvice.suggestedSpeedAdjustment.toFixed(2),
          })}
        </p>
      : null}

      {!isCompact ?
        <>
          <div className="mt-4 space-y-3">
            {plan.scenes.map((scene) => (
              <div key={scene.sceneId} className="rounded-xl border border-white/80 bg-white/90 p-3">
                <p className="text-xs font-semibold text-zinc-900">
                  {t("studio.animationPlan.sceneLine", {
                    index: String(scene.sceneOrder + 1),
                    title: scene.sceneTitle,
                    duration: String(scene.targetDuration),
                  })}
                </p>
                <ol className="mt-2 space-y-1.5">
                  {scene.shots.map((shot, idx) => (
                    <li key={`${scene.sceneId}-${idx}`} className="text-xs text-zinc-700">
                      <span className="font-medium tabular-nums text-zinc-500">
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
          </div>

          <div className="mt-4 rounded-xl border border-white/80 bg-white/90 p-3">
            <h4 className="text-xs font-semibold text-zinc-900">
              {t("studio.animationPlan.readiness.title")}
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-zinc-700">
              {(
                [
                  ["planPresent", plan.readiness.planPresent, "studio.animationPlan.readiness.planPresent"],
                  ["timingLogical", plan.readiness.timingLogical, "studio.animationPlan.readiness.timingLogical"],
                  ["imagesComplete", plan.readiness.imagesComplete, "studio.animationPlan.readiness.imagesComplete"],
                  [
                    "actionStructureComplete",
                    plan.readiness.actionStructureComplete,
                    "studio.animationPlan.readiness.actionStructureComplete",
                  ],
                ] as const
              ).map(([id, passed, key]) => (
                <li key={id} className="flex items-center gap-2">
                  <span className={readinessClass(passed)}>{passed ? "✓" : "○"}</span>
                  {t(key as TranslationKey)}
                </li>
              ))}
            </ul>
          </div>
        </>
      : null}

      {plan.missingImageCount > 0 && onSwitchTool ?
        <button
          type="button"
          onClick={() => onSwitchTool("visual")}
          className="mt-3 text-[10px] font-semibold text-[#0067B1] hover:underline"
        >
          {t("studio.animationPlan.openVisual")}
        </button>
      : null}
    </section>
  );
}
