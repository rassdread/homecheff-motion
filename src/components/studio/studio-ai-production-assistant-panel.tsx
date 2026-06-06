"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildCharacterConsistencySummary } from "@/lib/studio-character-consistency-summary";
import { buildImproveProjectPreview } from "@/lib/studio-improve-project-preview";
import { predictMotionQuality } from "@/lib/studio-motion-quality-prediction";
import { buildRenderReadinessSummary } from "@/lib/studio-render-readiness-summary";
import { buildSceneSuggestions } from "@/lib/studio-scene-suggestions";
import { buildStoryHealthAdvisorReport } from "@/lib/studio-story-health-advisor";
import { updateStudioSceneApi } from "@/lib/studio-storyboards-client";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const tone =
    score >= 75 ? "text-[#006D52] border-[#006D52]/30 bg-[#006D52]/5"
    : score >= 50 ? "text-amber-800 border-amber-200 bg-amber-50"
    : "text-red-800 border-red-200 bg-red-50";

  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${tone}`}>
      <p className="text-2xl font-bold tabular-nums">{score}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ignoredStorageKey(storyboardId: string): string {
  return `hc-ai-suggestions-ignored-${storyboardId}`;
}

export function StudioAiProductionAssistantPanel({
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  characters,
  canModify,
  onSceneUpdated,
}: Props) {
  const t = useActiveTranslator();
  const [ignored, setIgnored] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set();
    }
    try {
      const raw = window.localStorage.getItem(ignoredStorageKey(storyboard.id));
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [applyBusy, setApplyBusy] = useState<string | null>(null);
  const [improveOpen, setImproveOpen] = useState(false);

  const storyHealth = useMemo(
    () => buildStoryHealthAdvisorReport(storyboard, characters),
    [storyboard, characters]
  );
  const readiness = useMemo(() => buildRenderReadinessSummary(storyboard), [storyboard]);
  const quality = useMemo(
    () => predictMotionQuality(storyboard, characters),
    [storyboard, characters]
  );
  const consistency = useMemo(
    () => buildCharacterConsistencySummary(characters),
    [characters]
  );
  const suggestions = useMemo(
    () =>
      buildSceneSuggestions({ storyboard, scene, sceneIndex, sceneCount, cast: characters }).filter(
        (s) => !ignored.has(s.id)
      ),
    [storyboard, scene, sceneIndex, sceneCount, ignored]
  );
  const improvePreview = useMemo(
    () => buildImproveProjectPreview(storyboard),
    [storyboard]
  );

  const persistIgnored = useCallback(
    (next: Set<string>) => {
      setIgnored(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          ignoredStorageKey(storyboard.id),
          JSON.stringify([...next])
        );
      }
    },
    [storyboard.id]
  );

  const applySuggestion = async (suggestionId: string, patch: ReturnType<typeof buildSceneSuggestions>[0]["patch"]) => {
    if (!canModify || Object.keys(patch).length === 0) {
      return;
    }
    setApplyBusy(suggestionId);
    try {
      const res = await updateStudioSceneApi(storyboard.id, scene.id, patch);
      if (res.ok) {
        onSceneUpdated(res.data.scene);
      }
    } finally {
      setApplyBusy(null);
    }
  };

  const readinessLabelKey: TranslationKey =
    readiness.level === "ready"
      ? "studio.aiAssistant.readiness.level.ready"
      : readiness.level === "almost_ready"
        ? "studio.aiAssistant.readiness.level.almostReady"
        : "studio.aiAssistant.readiness.level.needsWork";

  const qualityLabelKey: TranslationKey =
    quality.level === "high"
      ? "studio.aiAssistant.quality.level.high"
      : quality.level === "medium"
        ? "studio.aiAssistant.quality.level.medium"
        : "studio.aiAssistant.quality.level.low";

  return (
    <section className="space-y-4 rounded-2xl border border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/5 via-white to-[#0067B1]/5 p-4 shadow-sm">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#006D52]">
          {t("studio.aiAssistant.label")}
        </p>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.aiAssistant.hint")}</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <ScoreRing score={storyHealth.score} label={t("studio.aiAssistant.storyHealth.scoreLabel")} />
        <ScoreRing score={readiness.score} label={t("studio.aiAssistant.readiness.scoreLabel")} />
        <ScoreRing score={quality.score} label={t("studio.aiAssistant.quality.scoreLabel")} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white/90 p-3">
        <p className="text-xs font-semibold text-zinc-900">{t("studio.aiAssistant.storyHealth.title")}</p>
        {storyHealth.advisories.length === 0 ?
          <p className="mt-2 text-xs text-[#006D52]">{t("studio.aiAssistant.storyHealth.allGood")}</p>
        : (
          <ul className="mt-2 space-y-1.5 text-xs text-zinc-700">
            {storyHealth.advisories.slice(0, 6).map((a) => (
              <li key={a.code} className="flex gap-2">
                <span aria-hidden>{a.severity === "warning" ? "⚠" : "ℹ"}</span>
                {t(a.messageKey as TranslationKey)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white/90 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-zinc-900">{t("studio.aiAssistant.readiness.title")}</p>
          <span className="rounded-full bg-[#0067B1]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0067B1]">
            {t(readinessLabelKey)}
          </span>
        </div>
        <ul className="mt-2 space-y-1 text-xs">
          {readiness.checks.map((check) => (
            <li key={check.id} className={check.passed ? "text-[#006D52]" : "text-zinc-600"}>
              {check.passed ? "✓" : "○"} {t(check.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
      </div>

      {suggestions.length > 0 ?
        <div className="rounded-xl border border-[#0067B1]/20 bg-white/90 p-3">
          <p className="text-xs font-semibold text-[#0067B1]">
            {t("studio.aiAssistant.suggestions.title")}
          </p>
          <ul className="mt-2 space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-800"
              >
                <p>{t(s.messageKey as TranslationKey)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canModify && Object.keys(s.patch).length > 0 ?
                    <button
                      type="button"
                      disabled={applyBusy === s.id}
                      onClick={() => void applySuggestion(s.id, s.patch)}
                      className="min-h-9 rounded-full bg-[#006D52] px-3 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      {applyBusy === s.id ? t("common.loading") : t("studio.aiAssistant.suggestions.apply")}
                    </button>
                  : null}
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(ignored);
                      next.add(s.id);
                      persistIgnored(next);
                    }}
                    className="min-h-9 rounded-full border border-zinc-200 px-3 text-[11px] font-semibold text-zinc-600"
                  >
                    {t("studio.aiAssistant.suggestions.ignore")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {consistency.characters.length > 0 ?
        <div className="rounded-xl border border-zinc-200 bg-white/90 p-3">
          <p className="text-xs font-semibold text-zinc-900">
            {t("studio.aiAssistant.consistency.title")} · {consistency.overallScore}/100
          </p>
          <ul className="mt-2 space-y-2 text-xs">
            {consistency.characters.slice(0, 5).map((c) => (
              <li key={c.characterId} className="flex justify-between gap-2">
                <span className="font-medium text-zinc-800">{c.name}</span>
                <span className="tabular-nums text-zinc-600">{c.score}</span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      <div className="rounded-xl border border-zinc-200 bg-white/90 p-3">
        <p className="text-xs font-semibold text-zinc-900">{t("studio.aiAssistant.quality.title")}</p>
        <p className="mt-1 text-sm font-bold text-[#006D52]">{t(qualityLabelKey)}</p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
          {quality.reasonKeys.map((key) => (
            <li key={key}>· {t(key as TranslationKey)}</li>
          ))}
        </ul>
      </div>

      {canModify ?
        <div className="rounded-xl border border-dashed border-[#006D52]/30 bg-white/80 p-3">
          <button
            type="button"
            onClick={() => setImproveOpen((v) => !v)}
            className="min-h-11 w-full rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white hover:bg-[#005a44]"
          >
            {t("studio.aiAssistant.improve.button")}
          </button>
          {improveOpen ?
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
              {improvePreview.items.length === 0 ?
                <p className="text-zinc-600">{t("studio.aiAssistant.improve.nothingToChange")}</p>
              : improvePreview.items.map((item) => (
                  <div key={item.sceneId} className="rounded-lg bg-zinc-50 p-2">
                    <p className="font-semibold text-zinc-800">
                      {item.order + 1}. {item.sceneTitle}
                    </p>
                    <ul className="mt-1 text-zinc-600">
                      {item.changes.map((ch, i) => (
                        <li key={i}>
                          {t(ch.fieldKey as TranslationKey)}: {ch.from} → {ch.to}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              <p className="text-[10px] text-zinc-500">{t("studio.aiAssistant.improve.previewHint")}</p>
            </div>
          : null}
        </div>
      : null}
    </section>
  );
}
