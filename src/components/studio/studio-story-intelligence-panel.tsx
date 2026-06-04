"use client";

import { useMemo, useState } from "react";
import { interpretAiDirectorPrompt } from "@/lib/studio-ai-director-interpreter";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import {
  shortMovementLabel,
  shortShotLabel,
} from "@/lib/studio-intelligence-timeline-chips";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { StudioShotPlanModal } from "@/components/studio/studio-shot-plan-modal";
import { updateStudioSceneApi } from "@/lib/studio-storyboards-client";
import type { ShotPlanRecommendation } from "@/lib/studio-auto-shot-planner";

type Props = {
  storyboard: StudioStoryboardDetail;
  directorProfile: StudioDirectorProfile;
  canModify?: boolean;
  onScenesUpdated?: () => void | Promise<void>;
};

function toFlowInput(storyboard: StudioStoryboardDetail): StoryFlowSceneInput[] {
  return storyboard.scenes.map((scene) => ({
    sceneId: scene.id,
    order: scene.order,
    title: scene.title,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    camera: scene.camera,
  }));
}

function energyBarHeight(level: string): string {
  switch (level) {
    case "high":
      return "h-10";
    case "medium":
      return "h-6";
    default:
      return "h-3";
  }
}

export function StudioStoryIntelligencePanel({
  storyboard,
  directorProfile,
  canModify,
  onScenesUpdated,
}: Props) {
  const t = useActiveTranslator();
  const profile = normalizeStudioDirectorProfile(directorProfile);
  const scenes = useMemo(() => toFlowInput(storyboard), [storyboard]);
  const report = useMemo(
    () => analyzeStoryIntelligence(scenes, profile),
    [scenes, profile]
  );
  const moodKeywords = useMemo(
    () => interpretAiDirectorPrompt(storyboard.aiDirectorPrompt ?? "").moodKeywords,
    [storyboard.aiDirectorPrompt]
  );
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<ShotPlanRecommendation[]>([]);
  const [applyingPlan, setApplyingPlan] = useState(false);

  const handleGenerateShotPlan = () => {
    setPendingPlan(report.plan);
    setPlanModalOpen(true);
  };

  const handleApplyPlan = async () => {
    if (!canModify || pendingPlan.length === 0) {
      setPlanModalOpen(false);
      return;
    }
    setApplyingPlan(true);
    try {
      for (const row of pendingPlan) {
        await updateStudioSceneApi(storyboard.id, row.sceneId, {
          shotType: row.shotType,
          cameraMovement: row.cameraMovement,
          sceneEnergy: row.sceneEnergy,
          camera: row.legacyCamera || undefined,
        });
      }
      setPlanModalOpen(false);
      await onScenesUpdated?.();
    } finally {
      setApplyingPlan(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {t("studio.intelligence.title")}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{t("studio.intelligence.hint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#006D52]/10 px-3 py-1 text-xs font-semibold text-[#006D52]">
                {t("studio.director.diversityScore", { score: report.shotDiversityScore })}
              </span>
              <span className="rounded-full bg-[#0067B1]/10 px-3 py-1 text-xs font-semibold text-[#0067B1]">
                {t("studio.intelligence.healthScore", { score: report.storyHealthScore })}
              </span>
            </div>
          </div>

          {canModify ?
            <button
              type="button"
              onClick={handleGenerateShotPlan}
              className="mt-3 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005592]"
            >
              {t("studio.intelligence.generateShotPlan")}
            </button>
          : null}

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.intelligence.arc.title")}
            </p>
            <ol className="mt-2 space-y-1.5">
              {report.arc.map((entry) => (
                <li
                  key={entry.sceneId}
                  className="flex flex-wrap items-baseline gap-x-2 text-sm text-zinc-800"
                >
                  <span className="font-semibold">
                    {t("studio.director.timeline.scene", { index: entry.order + 1 })}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="text-[#006D52]">
                    {t(entry.phaseLabelKey as TranslationKey)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.intelligence.chips.title")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.chips.flatMap((chip) => [
              <span
                key={`${chip.sceneId}-shot`}
                className="rounded-md border border-[#006D52]/25 bg-[#006D52]/5 px-2 py-0.5 text-[11px] font-semibold text-[#006D52]"
              >
                [{shortShotLabel(chip.shotValue)}]
              </span>,
              chip.movementValue || chip.shotValue ?
                <span
                  key={`${chip.sceneId}-mov`}
                  className="rounded-md border border-[#0067B1]/25 bg-[#0067B1]/5 px-2 py-0.5 text-[11px] font-semibold text-[#0067B1]"
                >
                  [{shortMovementLabel(chip.movementValue)}]
                </span>
              : null,
            ])}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.intelligence.energy.title")}
          </p>
          <div className="mt-3 flex items-end gap-1">
            {report.energyCurve.map((point) => (
              <div key={point.sceneId} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full max-w-[2rem] rounded-t bg-gradient-to-t from-[#0067B1]/30 to-[#0067B1] ${energyBarHeight(point.level)}`}
                  title={t(`studio.intelligence.energy.${point.level}` as TranslationKey)}
                />
                <span className="text-[9px] font-medium uppercase text-zinc-500">
                  {t(`studio.intelligence.energy.${point.level}` as TranslationKey).slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
            <span>{t("studio.intelligence.energy.low")}</span>
            <span>{t("studio.intelligence.energy.medium")}</span>
            <span>{t("studio.intelligence.energy.high")}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {moodKeywords.length > 0 ?
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.aiDirector.moodTitle")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {moodKeywords.map((mood) => (
                  <span
                    key={mood}
                    className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900"
                  >
                    {t(`studio.aiDirector.mood.${mood}` as TranslationKey)}
                  </span>
                ))}
              </div>
            </div>
          : null}
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.director.timeline.title")}
          </p>
          <ol className="mt-3 space-y-2">
            {report.timeline.map((entry) => (
              <li
                key={entry.sceneId}
                className="flex flex-wrap items-baseline gap-x-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-zinc-800">
                  {t("studio.director.timeline.scene", { index: entry.order + 1 })}
                </span>
                <span className="font-medium text-[#006D52]">
                  {t(entry.shotLabelKey as TranslationKey)}
                </span>
                {entry.movementValue ?
                  <span className="text-xs text-zinc-500">
                    · {t(entry.movementLabelKey as TranslationKey)}
                  </span>
                : null}
              </li>
            ))}
          </ol>
        </div>

        {report.warnings.length > 0 ?
          <ul className="space-y-2">
            {report.warnings.map((warning) => (
              <li
                key={`${warning.code}-${warning.sceneIds.join("-")}`}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                {t(warning.messageKey as TranslationKey)}
              </li>
            ))}
          </ul>
        : null}
      </div>

      <StudioShotPlanModal
        open={planModalOpen}
        plan={pendingPlan}
        busy={applyingPlan}
        onClose={() => setPlanModalOpen(false)}
        onConfirm={() => void handleApplyPlan()}
      />
    </>
  );
}
