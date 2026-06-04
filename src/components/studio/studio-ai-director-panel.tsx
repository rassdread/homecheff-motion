"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AI_DIRECTOR_STYLE_STRENGTHS,
  interpretAiDirectorPrompt,
  normalizeAiDirectorStyleStrength,
  type AiDirectorStyleStrength,
} from "@/lib/studio-ai-director-interpreter";
import {
  buildAiDirectorDirection,
  planFromCurrentScenes,
  type AiDirectorDirection,
} from "@/lib/studio-ai-director-direction";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { StudioAiDirectorCompareModal } from "@/components/studio/studio-ai-director-compare-modal";
import {
  updateStudioSceneApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";

type Props = {
  storyboard: StudioStoryboardDetail;
  canModify?: boolean;
  onStoryboardUpdated?: (storyboard: StudioStoryboardDetail) => void;
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

export function StudioAiDirectorPanel({
  storyboard,
  canModify,
  onStoryboardUpdated,
  onScenesUpdated,
}: Props) {
  const t = useActiveTranslator();
  const scenes = useMemo(() => toFlowInput(storyboard), [storyboard]);
  const [prompt, setPrompt] = useState(storyboard.aiDirectorPrompt ?? "");
  const [strength, setStrength] = useState<AiDirectorStyleStrength>(
    normalizeAiDirectorStyleStrength(storyboard.aiDirectorStyleStrength)
  );
  const [direction, setDirection] = useState<AiDirectorDirection | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPrompt(storyboard.aiDirectorPrompt ?? "");
      setStrength(normalizeAiDirectorStyleStrength(storyboard.aiDirectorStyleStrength));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storyboard.aiDirectorPrompt, storyboard.aiDirectorStyleStrength]);

  const liveInterpretation = useMemo(() => interpretAiDirectorPrompt(prompt), [prompt]);

  const handleSaveBrief = useCallback(async () => {
    if (!canModify) {
      return;
    }
    setSaveBusy(true);
    try {
      const res = await updateStudioStoryboardApi(storyboard.id, {
        aiDirectorPrompt: prompt,
        aiDirectorStyleStrength: strength,
      });
      if (res.ok && res.data.storyboard) {
        onStoryboardUpdated?.(res.data.storyboard);
      }
    } finally {
      setSaveBusy(false);
    }
  }, [canModify, onStoryboardUpdated, prompt, strength, storyboard.id]);

  const handleGenerateDirection = () => {
    const built = buildAiDirectorDirection({
      scenes,
      prompt,
      styleStrength: strength,
    });
    setDirection(built);
    setCompareOpen(true);
  };

  const handleApplyDirection = async () => {
    if (!canModify || !direction) {
      setCompareOpen(false);
      return;
    }
    setBusy(true);
    try {
      await updateStudioStoryboardApi(storyboard.id, {
        directorProfile: direction.interpretation.directorProfile,
        aiDirectorPrompt: prompt,
        aiDirectorStyleStrength: strength,
        promptStyleProfile: direction.interpretation.promptStyleProfile,
      });
      for (const row of direction.plan) {
        await updateStudioSceneApi(storyboard.id, row.sceneId, {
          shotType: row.shotType,
          cameraMovement: row.cameraMovement,
          sceneEnergy: row.sceneEnergy,
          camera: row.legacyCamera || undefined,
        });
      }
      setCompareOpen(false);
      await onScenesUpdated?.();
    } finally {
      setBusy(false);
    }
  };

  const currentPlan = useMemo(() => planFromCurrentScenes(scenes), [scenes]);
  const profileLabel = t(
    `studio.director.director.${direction?.interpretation.directorProfile ?? liveInterpretation.directorProfile}` as TranslationKey
  );

  return (
    <>
      <div className="mb-6 rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/5 to-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">{t("studio.aiDirector.title")}</p>
        <p className="mt-0.5 text-xs text-zinc-600">{t("studio.aiDirector.hint")}</p>

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
            {t("studio.aiDirector.moodTitle")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {liveInterpretation.moodKeywords.map((mood) => (
              <span
                key={mood}
                className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900"
              >
                {t(`studio.aiDirector.mood.${mood}` as TranslationKey)}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-700">{t("studio.aiDirector.strengthLabel")}</p>
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

        {liveInterpretation.matchedPresetKey ?
          <p className="mt-3 text-xs text-[#0067B1]">
            {t(liveInterpretation.matchedPresetKey as TranslationKey)} ·{" "}
            {t(liveInterpretation.cameraLanguageKey as TranslationKey)}
          </p>
        : (
          <p className="mt-3 text-xs text-zinc-500">
            {t(liveInterpretation.cameraLanguageKey as TranslationKey)} ·{" "}
            {t(liveInterpretation.pacingKey as TranslationKey)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canModify ?
            <button
              type="button"
              onClick={() => void handleSaveBrief()}
              disabled={saveBusy}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
            >
              {saveBusy ? t("studio.aiDirector.saving") : t("studio.aiDirector.saveBrief")}
            </button>
          : null}
          <button
            type="button"
            onClick={handleGenerateDirection}
            disabled={scenes.length === 0}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("studio.aiDirector.generateDirection")}
          </button>
        </div>

        {direction ?
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
            <p className="text-xs font-semibold text-zinc-700">
              {t("studio.aiDirector.qualityTitle")} · {profileLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {t("studio.intelligence.healthScore", { score: direction.storyHealthScore })} ·{" "}
              {t("studio.director.diversityScore", { score: direction.shotDiversityScore })} ·{" "}
              {t("studio.aiDirector.styleConsistency", {
                score: direction.styleConsistencyScore,
              })} ·{" "}
              {t("studio.aiDirector.directorQuality", { score: direction.directorQualityScore })}
            </p>
          </div>
        : null}

        {direction && direction.reasoning.length > 0 ?
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.aiDirector.reasoningTitle")}
            </p>
            <ul className="mt-2 space-y-2">
              {direction.reasoning.map((row) => (
                <li key={row.sceneId} className="text-xs text-zinc-700">
                  <span className="font-semibold">
                    {t("studio.director.timeline.scene", { index: row.order + 1 })}:
                  </span>{" "}
                  {t(row.reasonKey as TranslationKey, {
                    shot: t(`studio.director.shot.${row.shotType}` as TranslationKey),
                    movement: t(`studio.director.movement.${row.cameraMovement}` as TranslationKey),
                    phase: t(`studio.intelligence.arc.${row.arcPhase}` as TranslationKey),
                  })}
                </li>
              ))}
            </ul>
          </div>
        : null}
      </div>

      <StudioAiDirectorCompareModal
        open={compareOpen}
        currentPlan={currentPlan}
        aiPlan={direction?.plan ?? []}
        directorProfileLabel={profileLabel}
        busy={busy}
        onClose={() => setCompareOpen(false)}
        onConfirm={() => void handleApplyDirection()}
      />
    </>
  );
}
