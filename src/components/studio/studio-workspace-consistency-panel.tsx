"use client";

import { useMemo } from "react";
import { StudioAnimationPlanSummary } from "@/components/studio/studio-animation-plan-summary";
import { StudioViduExecutionPlanSummary } from "@/components/studio/studio-vidu-execution-plan-summary";
import { StudioAiSuggestionCard } from "@/components/studio/studio-ai-suggestion-card";
import { StudioWorldIdentityRulesSummary } from "@/components/studio/studio-world-identity-rules-summary";
import { StudioIdentityConsumptionSummary } from "@/components/studio/studio-identity-consumption-summary";
import { StudioRenderStrategySummary } from "@/components/studio/studio-render-strategy-summary";
import { StudioActionSequenceSummary } from "@/components/studio/studio-action-sequence-summary";
import { StudioTranscriptStatusLine } from "@/components/studio/studio-transcript-status-line";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildStudioConsistencyOverview,
  type ConsistencyDomain,
  type ConsistencyDomainId,
  type ConsistencyLevel,
} from "@/lib/studio-consistency-overview";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioToolId } from "@/lib/studio-tool-id";
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
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  onSwitchTool?: (tool: StudioToolId) => void;
};

const DOMAIN_TITLE_KEYS: Record<ConsistencyDomainId, TranslationKey> = {
  story: "studio.consistency.domain.story",
  visual: "studio.consistency.domain.visual",
  characters: "studio.consistency.domain.characters",
  locations: "studio.consistency.domain.locations",
  props: "studio.consistency.domain.props",
  voice: "studio.consistency.domain.voice",
  audio: "studio.consistency.domain.audio",
  render: "studio.consistency.domain.render",
};

const DOMAIN_TOOL: Partial<Record<ConsistencyDomainId, StudioToolId>> = {
  story: "story",
  visual: "visual",
  characters: "characters",
  locations: "locations",
  props: "props",
  voice: "voice",
  audio: "music",
  render: "render",
};

function levelCardClass(level: ConsistencyLevel): string {
  if (level === "ready") {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (level === "almost_ready") {
    return "border-amber-200 bg-amber-50/70";
  }
  return "border-red-200 bg-red-50/70";
}

function levelLabelKey(level: ConsistencyLevel): TranslationKey {
  if (level === "ready") {
    return "studio.execution.softGate.ready";
  }
  if (level === "almost_ready") {
    return "studio.execution.softGate.review";
  }
  return "studio.execution.softGate.missing";
}

function DomainCard({
  domain,
  onOpen,
}: {
  domain: ConsistencyDomain;
  onOpen?: () => void;
}) {
  const t = useActiveTranslator();

  return (
    <article className={`rounded-xl border p-3 ${levelCardClass(domain.level)}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-zinc-900">
          {t(DOMAIN_TITLE_KEYS[domain.id])}
        </h4>
        <span className="text-sm font-bold tabular-nums text-zinc-800">{domain.score}</span>
      </div>
      <p className="mt-1 text-[10px] font-medium text-zinc-600">{t(levelLabelKey(domain.level))}</p>
      {onOpen ?
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 text-[10px] font-semibold text-[#0067B1] hover:underline"
        >
          {t("studio.execution.action.open")}
        </button>
      : null}
    </article>
  );
}

export function StudioWorkspaceConsistencyPanel({
  storyboard,
  characters,
  locations = [],
  props = [],
  worlds = [],
  styleProfile,
  directorProfile,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const overview = useMemo(
    () =>
      buildStudioConsistencyOverview({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        styleProfile,
        directorProfile,
      }),
    [storyboard, characters, locations, props, worlds, styleProfile, directorProfile]
  );

  const unified = useMemo(
    () =>
      buildStudioUnifiedReadiness({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        styleProfile,
        directorProfile,
      }),
    [storyboard, characters, locations, props, worlds, styleProfile, directorProfile]
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.consistency")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.consistency.hint")}</p>
      </div>

      <section
        className={`rounded-2xl border p-4 text-center ${levelCardClass(unified.level)}`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          {t("studio.consistency.overall.title")}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-zinc-900">{unified.score}</p>
        <p className="mt-1 text-xs font-medium text-zinc-700">{t(unified.softGateKey as TranslationKey)}</p>
      </section>

      <section className={`rounded-2xl border p-4 ${levelCardClass(unified.level)}`}>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.execution.readyToContinue")}
        </h3>
        <p className="mt-1 text-xs text-zinc-700">
          {t("studio.consistency.renderReady.score", { score: String(unified.score) })}
          {" · "}
          {t(unified.softGateKey as TranslationKey)}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-700">
          {unified.checks.map((check) => (
            <li key={check.id} className="flex items-center gap-2">
              <span className={check.passed ? "text-emerald-700" : "text-zinc-400"}>
                {check.passed ? "✓" : "○"}
              </span>
              {t(check.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
      </section>

      {storyboard.voiceEnabled ?
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.consistency.transcript.title")}
          </h3>
          <p className="mt-1 text-xs text-zinc-600">{t("studio.consistency.transcript.hint")}</p>
          <div className="mt-3">
            <StudioTranscriptStatusLine
              storyboardId={storyboard.id}
              voiceEnabled={Boolean(storyboard.voiceEnabled)}
              language={(storyboard.voiceLanguage ?? "en").slice(0, 2)}
            />
          </div>
        </section>
      : null}

      {unified.fixes.length > 0 ?
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.execution.suggestedImprovements")}
          </h3>
          {unified.fixes.slice(0, 6).map((fix) => (
            <StudioAiSuggestionCard
              key={fix.id}
              titleKey="studio.execution.suggestedImprovement"
              issueKey={fix.issueKey as TranslationKey}
              reasonKey={fix.reasonKey as TranslationKey | undefined}
              currentLabel={fix.currentLabel}
              suggestedLabel={fix.suggestedLabel}
              suggestedIsLabelKey={fix.suggestedLabel.startsWith("studio.")}
              canApply={Boolean(fix.suggestedAssetId || fix.suggestedVoiceProfile)}
              onOpen={onSwitchTool ? () => onSwitchTool(fix.tool) : undefined}
            />
          ))}
        </section>
      : null}

      <StudioRenderStrategySummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        plan={unified.renderStrategyPlan}
        variant="full"
      />

      <StudioActionSequenceSummary
        storyboard={storyboard}
        characters={characters}
        props={props}
        worlds={worlds}
        variant="full"
      />

      <StudioAnimationPlanSummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        variant="full"
        onSwitchTool={onSwitchTool}
      />

      <StudioViduExecutionPlanSummary
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        variant="full"
        onSwitchTool={onSwitchTool}
      />

      <StudioWorldIdentityRulesSummary worlds={worlds} />

      <StudioIdentityConsumptionSummary
        storyboard={storyboard}
        libraries={{ characters, locations, props, worlds }}
        showTrends={false}
        variant="full"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {overview.domains.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            onOpen={
              onSwitchTool && DOMAIN_TOOL[domain.id]
                ? () => onSwitchTool(DOMAIN_TOOL[domain.id]!)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
