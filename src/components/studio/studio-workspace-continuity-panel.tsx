"use client";

import { useMemo } from "react";
import { StudioAiSuggestionCard } from "@/components/studio/studio-ai-suggestion-card";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { analyzeAssetEvolutionContinuity } from "@/lib/studio-asset-evolution";
import {
  buildContinuityLibrarySections,
  buildProjectContinuityScore,
  type ContinuityLibraryItem,
} from "@/lib/studio-project-continuity-score";
import { findRecurringMatchesForIdea } from "@/lib/studio-recurring-asset-detection";
import { StudioIdentityConsumptionSummary } from "@/components/studio/studio-identity-consumption-summary";
import { StudioProductionMemoryPanel } from "@/components/studio/studio-production-memory-panel";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import {
  buildProductionTimeline,
  productionTimelineMemoryGuidanceKeys,
} from "@/lib/studio-production-timeline";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory: StudioProjectMemorySnapshot;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  onSwitchTool?: (tool: StudioToolId) => void;
};

const SECTION_TITLE_KEYS = {
  characters: "studio.continuity.section.characters",
  locations: "studio.continuity.section.locations",
  worlds: "studio.continuity.section.worlds",
  voices: "studio.continuity.section.voices",
  narrationAudio: "studio.continuity.section.narrationAudio",
  styles: "studio.continuity.section.styles",
  shotPatterns: "studio.continuity.section.shotPatterns",
} as const satisfies Record<string, TranslationKey>;

function levelCardClass(level: "ready" | "almost_ready" | "needs_work"): string {
  if (level === "ready") {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (level === "almost_ready") {
    return "border-amber-200 bg-amber-50/70";
  }
  return "border-red-200 bg-red-50/70";
}

function LibraryRow({
  item,
  onOpen,
}: {
  item: ContinuityLibraryItem;
  onOpen?: () => void;
}) {
  const t = useActiveTranslator();
  const name =
    item.name.startsWith("studio.") ? t(item.name as TranslationKey) : item.name;

  return (
    <li className="rounded-lg border border-zinc-100 bg-white px-3 py-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900">{name}</p>
          {item.subtitleKey ?
            <p className="mt-0.5 text-zinc-600">
              {t(item.subtitleKey as TranslationKey, item.subtitleParams)}
            </p>
          : null}
          {item.inCurrentProject ?
            <p className="mt-1 text-[10px] font-medium text-[#0067B1]">
              {t("studio.continuity.inCurrentProject")}
            </p>
          : null}
        </div>
        {onOpen ?
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 text-[10px] font-semibold text-[#0067B1] hover:underline"
          >
            {t("studio.execution.action.open")}
          </button>
        : null}
      </div>
    </li>
  );
}

export function StudioWorkspaceContinuityPanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  memory,
  styleProfile,
  directorProfile,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const continuityScore = useMemo(
    () =>
      buildProjectContinuityScore({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        memory,
        styleProfile,
        directorProfile,
      }),
    [storyboard, characters, locations, props, worlds, memory, styleProfile, directorProfile]
  );

  const timelineGuidanceKeys = useMemo(() => {
    const assetDecisionRegistry = loadAssetDecisionRegistry({ storyboardId: storyboard.id });
    const timeline = buildProductionTimeline({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: memory,
      assetDecisionRegistry,
    });
    return productionTimelineMemoryGuidanceKeys(timeline);
  }, [storyboard, characters, locations, props, worlds, memory]);

  const sections = useMemo(
    () =>
      buildContinuityLibrarySections({
        storyboard,
        characters,
        locations,
        worlds,
        memory,
      }),
    [storyboard, characters, locations, worlds, memory]
  );

  const reuseSuggestions = useMemo(() => {
    const idea = `${storyboard.title} ${storyboard.description} ${storyboard.aiDirectorPrompt}`;
    return findRecurringMatchesForIdea({
      idea,
      characters,
      locations,
      props,
      worlds,
      memory,
    }).filter((match) => match.usage.storyboardCount >= 1);
  }, [storyboard, characters, locations, props, worlds, memory]);

  const assetContinuityAdvice = useMemo(
    () =>
      analyzeAssetEvolutionContinuity({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        memory,
      }),
    [storyboard, characters, locations, props, worlds, memory]
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.continuity")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.continuity.hint")}</p>
      </div>

      <section className={`rounded-2xl border p-4 ${levelCardClass(continuityScore.level)}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          {t("studio.continuity.scoreTitle")}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-zinc-900">{continuityScore.score}</p>
        <p className="mt-1 text-xs text-zinc-700">
          {t("studio.continuity.scoreHint", {
            reused: String(continuityScore.reusedAssetCount),
            linked: String(continuityScore.linkedAssetCount),
          })}
        </p>
        {continuityScore.recommendationKeys.length > 0 ?
          <ul className="mt-3 space-y-1 text-xs text-zinc-700">
            {continuityScore.recommendationKeys.map((key) => (
              <li key={key}>→ {t(key as TranslationKey)}</li>
            ))}
          </ul>
        : null}
      </section>

      <StudioIdentityConsumptionSummary
        storyboard={storyboard}
        libraries={{ characters, locations, props, worlds }}
        memory={memory}
        showConsistency={false}
        variant="compact"
      />

      <StudioProductionMemoryPanel
        memory={memory}
        currentIdea={storyboard.aiDirectorPrompt}
        characters={characters}
        worlds={worlds}
        props={props}
        compact
        timelineGuidanceKeys={timelineGuidanceKeys}
      />

      {reuseSuggestions.length > 0 ?
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.continuity.suggestedReuse")}
          </h3>
          {reuseSuggestions.slice(0, 4).map((match) => (
            <StudioAiSuggestionCard
              key={`${match.kind}-${match.assetId}`}
              titleKey="studio.continuity.suggestedReuse"
              issueKey={
                (match.kind === "character"
                  ? "studio.continuity.knownCharacter"
                  : match.kind === "location"
                    ? "studio.continuity.knownLocation"
                    : "studio.continuity.partOfUniverse") as TranslationKey
              }
              reasonKey="studio.continuity.previouslyUsed"
              currentLabel="—"
              suggestedLabel={match.assetName}
              onOpen={
                onSwitchTool ?
                  () =>
                    onSwitchTool(
                      match.kind === "character" ? "characters"
                      : match.kind === "location" ? "locations"
                      : "world"
                    )
                : undefined
              }
            />
          ))}
        </section>
      : null}

      {assetContinuityAdvice.length > 0 ?
        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.assetEvolution.continuity.title")}
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {assetContinuityAdvice.map((item) => (
              <li key={item.code}>
                → {t(item.messageKey as TranslationKey)}
                {item.sceneOrders.length > 0 ?
                  ` (${item.sceneOrders.map((o) => o + 1).join(", ")})`
                : ""}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {sections.map((section) =>
        section.items.length > 0 ?
          <section key={section.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">
              {t(SECTION_TITLE_KEYS[section.id])}
            </h3>
            <ul className="space-y-2">
              {section.items.slice(0, 8).map((item) => (
                <LibraryRow
                  key={item.id}
                  item={item}
                  onOpen={onSwitchTool ? () => onSwitchTool(item.tool) : undefined}
                />
              ))}
            </ul>
          </section>
        : null
      )}
    </div>
  );
}
