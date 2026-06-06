"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildStudioConsistencyOverview,
  type ConsistencyDomain,
  type ConsistencyDomainId,
  type ConsistencyLevel,
} from "@/lib/studio-consistency-overview";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
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
    return "studio.consistency.level.ready";
  }
  if (level === "almost_ready") {
    return "studio.consistency.level.almostReady";
  }
  return "studio.consistency.level.needsWork";
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
      {domain.recommendationKeys.length > 0 ?
        <ul className="mt-2 space-y-0.5 text-[10px] text-zinc-600">
          {domain.recommendationKeys.slice(0, 2).map((key) => (
            <li key={key}>→ {t(key as TranslationKey)}</li>
          ))}
        </ul>
      : null}
      {onOpen ?
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 text-[10px] font-semibold text-[#0067B1] hover:underline"
        >
          {t("studio.consistency.openTool")}
        </button>
      : null}
    </article>
  );
}

export function StudioWorkspaceConsistencyPanel({
  storyboard,
  characters,
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
        styleProfile,
        directorProfile,
      }),
    [storyboard, characters, styleProfile, directorProfile]
  );

  const renderLevelKey =
    overview.renderReadiness.level === "ready"
      ? "studio.consistency.level.ready"
      : overview.renderReadiness.level === "almost_ready"
        ? "studio.consistency.level.almostReady"
        : "studio.consistency.level.needsWork";

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.consistency")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.consistency.hint")}</p>
      </div>

      <section
        className={`rounded-2xl border p-4 text-center ${levelCardClass(overview.overallLevel)}`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          {t("studio.consistency.overall.title")}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-zinc-900">{overview.overallScore}</p>
        <p className="mt-1 text-xs font-medium text-zinc-700">{t(levelLabelKey(overview.overallLevel))}</p>
      </section>

      <section className={`rounded-2xl border p-4 ${levelCardClass(overview.renderReadiness.level)}`}>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.consistency.renderReady.title")}
        </h3>
        <p className="mt-1 text-xs text-zinc-700">
          {t("studio.consistency.renderReady.score", {
            score: String(overview.renderReadiness.score),
          })}
          {" · "}
          {t(renderLevelKey)}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-700">
          {overview.renderReadiness.checks.map((check) => (
            <li key={check.id} className="flex items-center gap-2">
              <span className={check.passed ? "text-emerald-700" : "text-zinc-400"}>
                {check.passed ? "✓" : "○"}
              </span>
              {t(check.messageKey as TranslationKey)}
            </li>
          ))}
        </ul>
      </section>

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
