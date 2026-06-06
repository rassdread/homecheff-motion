"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { StudioAiSuggestionCard } from "@/components/studio/studio-ai-suggestion-card";
import { buildImproveProjectPreview } from "@/lib/studio-improve-project-preview";
import { findRecurringMatchesForIdea } from "@/lib/studio-recurring-asset-detection";
import { buildSceneSuggestions } from "@/lib/studio-scene-suggestions";
import { buildStudioProductionInsights } from "@/lib/studio-production-insights";
import type { StudioToolId } from "@/lib/studio-tool-id";
import { updateStudioSceneApi } from "@/lib/studio-storyboards-client";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  /** Mobile bottom sheet: tighter layout, no improve-project block */
  compact?: boolean;
  onSwitchTool?: (tool: StudioToolId) => void;
  projectMemory?: StudioProjectMemorySnapshot | null;
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

function InsightSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-900">{title}</p>
        {badge}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ignoredStorageKey(storyboardId: string): string {
  return `hc-ai-suggestions-ignored-${storyboardId}`;
}

export function StudioProductionInsightsRail({
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  characters,
  canModify,
  onSceneUpdated,
  compact = false,
  onSwitchTool,
  projectMemory,
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

  const insights = useMemo(
    () => buildStudioProductionInsights(storyboard, characters),
    [storyboard, characters]
  );

  const suggestions = useMemo(
    () =>
      buildSceneSuggestions({ storyboard, scene, sceneIndex, sceneCount, cast: characters }).filter(
        (s) => !ignored.has(s.id)
      ),
    [storyboard, scene, sceneIndex, sceneCount, characters, ignored]
  );

  const improvePreview = useMemo(() => buildImproveProjectPreview(storyboard), [storyboard]);

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

  const applySuggestion = async (
    suggestionId: string,
    patch: ReturnType<typeof buildSceneSuggestions>[0]["patch"]
  ) => {
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

  const readinessLabelKey: TranslationKey = insights.unifiedReadiness.softGateKey as TranslationKey;

  const qualityLabelKey: TranslationKey =
    insights.quality.level === "high"
      ? "studio.aiAssistant.quality.level.high"
      : insights.quality.level === "medium"
        ? "studio.aiAssistant.quality.level.medium"
        : "studio.aiAssistant.quality.level.low";

  const reuseMatches = useMemo(() => {
    if (!projectMemory) {
      return [];
    }
    const idea = `${storyboard.title} ${storyboard.description} ${storyboard.aiDirectorPrompt}`;
    return findRecurringMatchesForIdea({
      idea,
      characters,
      locations: [],
      props: [],
      worlds: [],
      memory: projectMemory,
    }).slice(0, compact ? 2 : 3);
  }, [storyboard, characters, projectMemory, compact]);

  const shellClass = compact
    ? "space-y-3"
    : "space-y-4 rounded-2xl border border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/5 via-white to-[#0067B1]/5 p-4 shadow-sm";

  return (
    <section className={shellClass}>
      {!compact ?
        <header>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#006D52]">
            {t("studio.productionInsights.label")}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{t("studio.productionInsights.hint")}</p>
        </header>
      : null}

      <div className="grid grid-cols-3 gap-2">
        <ScoreRing
          score={insights.storyHealth.score}
          label={t("studio.aiAssistant.storyHealth.scoreLabel")}
        />
        <ScoreRing
          score={insights.readiness.score}
          label={t("studio.aiAssistant.readiness.scoreLabel")}
        />
        <ScoreRing
          score={insights.quality.score}
          label={t("studio.aiAssistant.quality.scoreLabel")}
        />
      </div>

      <InsightSection title={t("studio.aiAssistant.storyHealth.title")}>
        {insights.storyHealth.advisories.length === 0 ?
          <p className="text-xs text-[#006D52]">{t("studio.aiAssistant.storyHealth.allGood")}</p>
        : (
          <ul className="space-y-1.5 text-xs text-zinc-700">
            {insights.storyHealth.advisories.slice(0, 6).map((a) => (
              <li key={a.code} className="flex gap-2">
                <span aria-hidden>{a.severity === "warning" ? "⚠" : "ℹ"}</span>
                {t(a.messageKey as TranslationKey)}
              </li>
            ))}
          </ul>
        )}
      </InsightSection>

      <InsightSection
        title={t("studio.aiAssistant.readiness.title")}
        badge={
          <span className="rounded-full bg-[#0067B1]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0067B1]">
            {t(readinessLabelKey)}
          </span>
        }
      >
        <ul className="space-y-1 text-xs">
          {insights.readiness.checks.map((check) => (
            <li key={check.id} className={check.passed ? "text-[#006D52]" : "text-zinc-600"}>
              {check.passed ? "✓" : "○"} {t(check.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
      </InsightSection>

      {reuseMatches.length > 0 ?
        <InsightSection title={t("studio.continuity.suggestedReuse")}>
          <div className="space-y-2">
            {reuseMatches.map((match) => (
              <StudioAiSuggestionCard
                key={`${match.kind}-${match.assetId}`}
                titleKey="studio.continuity.suggestedReuse"
                issueKey={
                  (match.kind === "character"
                    ? "studio.continuity.knownCharacter"
                    : "studio.continuity.knownLocation") as TranslationKey
                }
                reasonKey="studio.continuity.previouslyUsed"
                currentLabel="—"
                suggestedLabel={match.assetName}
                onOpen={
                  onSwitchTool ?
                    () =>
                      onSwitchTool(match.kind === "character" ? "characters" : "locations")
                  : undefined
                }
              />
            ))}
            {onSwitchTool ?
              <button
                type="button"
                onClick={() => onSwitchTool("continuity")}
                className="text-[10px] font-semibold text-[#0067B1] hover:underline"
              >
                {t("studio.continuity.openPanel")}
              </button>
            : null}
          </div>
        </InsightSection>
      : null}

      {insights.unifiedReadiness.fixes.length > 0 ?
        <InsightSection title={t("studio.execution.suggestedImprovements")}>
          <div className="space-y-2">
            {insights.unifiedReadiness.fixes.slice(0, compact ? 3 : 5).map((fix) => (
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
          </div>
        </InsightSection>
      : null}

      {!compact && insights.consistency.characters.length > 0 ?
        <InsightSection
          title={t("studio.aiAssistant.consistency.title")}
          badge={
            <span className="text-xs font-bold tabular-nums text-zinc-600">
              {insights.consistency.overallScore}/100
            </span>
          }
        >
          <ul className="space-y-2 text-xs">
            {insights.consistency.characters.slice(0, 5).map((c) => (
              <li key={c.characterId} className="flex justify-between gap-2">
                <span className="font-medium text-zinc-800">{c.name}</span>
                <span className="tabular-nums text-zinc-600">{c.score}</span>
              </li>
            ))}
          </ul>
        </InsightSection>
      : null}

      <InsightSection title={t("studio.aiAssistant.quality.title")}>
        <p className="text-sm font-bold text-[#006D52]">{t(qualityLabelKey)}</p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
          {insights.quality.reasonKeys.map((key) => (
            <li key={key}>· {t(key as TranslationKey)}</li>
          ))}
        </ul>
      </InsightSection>

      {suggestions.length > 0 ?
        <InsightSection title={t("studio.aiAssistant.suggestions.title")}>
          <ul className="space-y-2">
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
        </InsightSection>
      : null}

      {!compact && canModify ?
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
