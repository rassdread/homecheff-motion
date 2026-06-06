"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AI_DIRECTOR_STYLE_STRENGTHS,
  interpretAiDirectorPrompt,
  normalizeAiDirectorStyleStrength,
  type AiDirectorStyleStrength,
} from "@/lib/studio-ai-director-interpreter";
import {
  buildCurrentStoryboardShotPlan,
  buildProposedStoryboardShotPlan,
  analyzeShotPlanConsistency,
} from "@/lib/studio-shot-planner";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { SceneShotPlan, ShotBeatRole } from "@/types/studio-shot-planner";
import {
  updateStudioSceneApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import { legacyCameraFromShotType } from "@/lib/studio-scene-director";
import { StudioShotPlannerCompareModal } from "@/components/studio/studio-shot-planner-compare-modal";

type Props = {
  storyboard: StudioStoryboardDetail;
  canModify?: boolean;
  onStoryboardUpdated?: (storyboard: StudioStoryboardDetail) => void;
  onScenesUpdated?: () => void | Promise<void>;
};

const BEAT_ROLE_KEYS: Record<ShotBeatRole, TranslationKey> = {
  opening: "studio.shotPlanner.openingShot",
  focus: "studio.shotPlanner.focusShot",
  detail: "studio.shotPlanner.detailShot",
  closing: "studio.shotPlanner.closingShot",
};

function beatLabel(
  beat: SceneShotPlan["beats"][number],
  t: (key: TranslationKey, params?: Record<string, string>) => string
): string {
  if (beat.label.trim()) {
    return beat.label;
  }
  if (beat.labelKey) {
    return t(beat.labelKey as TranslationKey);
  }
  return t(`studio.director.shot.${beat.shotType}` as TranslationKey);
}

export function StudioWorkspaceShotPlannerPanel({
  storyboard,
  canModify,
  onStoryboardUpdated,
  onScenesUpdated,
}: Props) {
  const t = useActiveTranslator();
  const [prompt, setPrompt] = useState(storyboard.aiDirectorPrompt ?? "");
  const [strength, setStrength] = useState<AiDirectorStyleStrength>(
    normalizeAiDirectorStyleStrength(storyboard.aiDirectorStyleStrength)
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proposedPlan, setProposedPlan] = useState<ReturnType<
    typeof buildProposedStoryboardShotPlan
  > | null>(null);

  const currentPlan = useMemo(
    () => buildCurrentStoryboardShotPlan(storyboard),
    [storyboard]
  );

  const consistencyAdvice = useMemo(
    () => analyzeShotPlanConsistency(currentPlan),
    [currentPlan]
  );

  const liveInterpretation = useMemo(() => interpretAiDirectorPrompt(prompt), [prompt]);

  const handleGenerateProposal = () => {
    const built = buildProposedStoryboardShotPlan({
      storyboard,
      prompt,
      styleStrength: strength,
    });
    setProposedPlan(built);
    setCompareOpen(true);
  };

  const handleApplyProposal = useCallback(async () => {
    if (!canModify || !proposedPlan) {
      setCompareOpen(false);
      return;
    }
    setBusy(true);
    try {
      const { direction } = proposedPlan;
      const res = await updateStudioStoryboardApi(storyboard.id, {
        directorProfile: direction.interpretation.directorProfile,
        aiDirectorPrompt: prompt,
        aiDirectorStyleStrength: strength,
        promptStyleProfile: direction.interpretation.promptStyleProfile,
      });
      if (res.ok && res.data.storyboard) {
        onStoryboardUpdated?.(res.data.storyboard);
      }
      for (const row of direction.plan) {
        await updateStudioSceneApi(storyboard.id, row.sceneId, {
          shotType: row.shotType,
          cameraMovement: row.cameraMovement,
          sceneEnergy: row.sceneEnergy,
          camera: row.legacyCamera || legacyCameraFromShotType(row.shotType) || undefined,
        });
      }
      setCompareOpen(false);
      await onScenesUpdated?.();
    } finally {
      setBusy(false);
    }
  }, [
    canModify,
    onScenesUpdated,
    onStoryboardUpdated,
    prompt,
    proposedPlan,
    strength,
    storyboard.id,
  ]);

  const profileLabel = t(
    `studio.director.director.${proposedPlan?.direction.interpretation.directorProfile ?? liveInterpretation.directorProfile}` as TranslationKey
  );

  return (
    <>
      <section className="rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/5 to-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-zinc-900">{t("studio.shotPlanner.title")}</h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.shotPlanner.hint")}</p>

        <label className="mt-4 block text-sm font-medium text-zinc-800">
          {t("studio.aiDirector.promptLabel")}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            disabled={!canModify}
            placeholder={t("studio.aiDirector.promptPlaceholder")}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>

        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.aiDirector.strengthLabel")}
          </p>
          <div className="mt-1 flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-medium">
            {AI_DIRECTOR_STYLE_STRENGTHS.map((level) => (
              <button
                key={level}
                type="button"
                disabled={!canModify}
                onClick={() => setStrength(level)}
                className={`flex-1 rounded-full px-3 py-1.5 transition ${
                  strength === level ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
                }`}
              >
                {t(`studio.aiDirector.strength.${level}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        {canModify ?
          <button
            type="button"
            onClick={handleGenerateProposal}
            className="mt-4 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("studio.shotPlanner.generateProposal")}
          </button>
        : null}
      </section>

      <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
        <h3 className="text-sm font-semibold text-violet-950">
          {t("studio.shotPlanner.currentTitle")}
        </h3>
        <ul className="mt-3 space-y-3">
          {currentPlan.scenes.map((scenePlan) => (
            <li
              key={scenePlan.sceneId}
              className="rounded-xl border border-white/80 bg-white px-3 py-2 text-xs"
            >
              <p className="font-semibold text-zinc-900">
                {t("studio.director.timeline.scene", { index: scenePlan.order + 1 })}
                {scenePlan.title.trim() ? ` · ${scenePlan.title}` : ""}
              </p>
              <dl className="mt-2 space-y-1 text-zinc-700">
                {scenePlan.beats
                  .filter((beat) => beat.present)
                  .map((beat) => (
                    <div key={beat.role} className="flex gap-2">
                      <dt className="w-20 shrink-0 font-medium text-violet-900">
                        {t(BEAT_ROLE_KEYS[beat.role])}:
                      </dt>
                      <dd>
                        {beatLabel(beat, t)}
                        {" · "}
                        {t(`studio.director.shot.${beat.shotType}` as TranslationKey)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {consistencyAdvice.length > 0 ?
        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.shotPlanner.consistencyTitle")}
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {consistencyAdvice.map((item) => (
              <li key={item.code}>→ {t(item.messageKey as TranslationKey)}</li>
            ))}
          </ul>
        </section>
      : null}

      <StudioShotPlannerCompareModal
        open={compareOpen}
        currentPlan={currentPlan}
        proposedPlan={proposedPlan?.plan ?? currentPlan}
        directorProfileLabel={profileLabel}
        busy={busy}
        onClose={() => setCompareOpen(false)}
        onConfirm={() => void handleApplyProposal()}
      />
    </>
  );
}
