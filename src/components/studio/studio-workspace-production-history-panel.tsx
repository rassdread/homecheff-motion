"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { loadDirectorDecisionRegistry } from "@/lib/studio-director-decision-storage";
import { buildProductionTimelineWithPatterns } from "@/lib/studio-production-pattern-profile";
import { buildSnapshotTimelineEvents } from "@/lib/studio-snapshot-context";
import { StudioWorkspaceSnapshotsSection } from "@/components/studio/studio-workspace-snapshots-section";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { ProductionTimelineEventCategory } from "@/types/studio-production-timeline";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  onSwitchTool?: (tool: StudioToolId) => void;
  onRefreshStoryboard?: () => void | Promise<void>;
  canModify?: boolean;
};

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function categoryLabelKey(category: ProductionTimelineEventCategory): TranslationKey {
  switch (category) {
    case "brief":
      return "studio.productionTimeline.category.brief";
    case "asset":
      return "studio.productionTimeline.category.asset";
    case "director":
      return "studio.productionTimeline.category.director";
    case "evolution":
      return "studio.productionTimeline.category.evolution";
    case "memory":
      return "studio.productionTimeline.category.memory";
    default:
      return "studio.productionTimeline.category.general";
  }
}

export function StudioWorkspaceProductionHistoryPanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  projectMemory,
  onSwitchTool,
  onRefreshStoryboard,
  canModify = true,
}: Props) {
  const t = useActiveTranslator();

  const timeline = useMemo(() => {
    const assetDecisionRegistry = loadAssetDecisionRegistry({ storyboardId: storyboard.id });
    const decisionRegistry = loadDirectorDecisionRegistry(storyboard.id);
    const base = buildProductionTimelineWithPatterns({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      assetDecisionRegistry,
      directorApplyAudits: decisionRegistry.audits,
      directorApplyBaseline: decisionRegistry.applyBaseline,
    });
    const snapshotEvents = buildSnapshotTimelineEvents(storyboard.id);
    return {
      ...base,
      timelineEvents: [...snapshotEvents, ...base.timelineEvents].sort(
        (a, b) => Date.parse(b.at) - Date.parse(a.at)
      ),
    };
  }, [storyboard, characters, locations, props, worlds, projectMemory]);

  const locale = typeof navigator !== "undefined" ? navigator.language : "en";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.productionTimeline.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.productionTimeline.subtitle")}</p>
      </div>

      <StudioWorkspaceSnapshotsSection
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        canModify={canModify}
        onRestored={onRefreshStoryboard}
        onSwitchTool={onSwitchTool}
      />

      {timeline.milestones.length > 0 ?
        <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <h3 className="text-sm font-semibold text-sky-950">
            {t("studio.productionTimeline.section.milestones")}
          </h3>
          <ul className="mt-3 space-y-2">
            {timeline.milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-900">
                  {t(milestone.titleKey as TranslationKey, milestone.titleParams)}
                </span>
                {milestone.patternHintKey ?
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
                    {t(milestone.patternHintKey as TranslationKey, milestone.patternHintParams)}
                  </span>
                : null}
                <span className="text-xs text-zinc-500">{formatWhen(milestone.at, locale)}</span>
                {milestone.toolId && onSwitchTool ?
                  <button
                    type="button"
                    onClick={() => onSwitchTool(milestone.toolId!)}
                    className="text-xs font-semibold text-[#0067B1] hover:underline"
                  >
                    {t("studio.productionTimeline.action.open")}
                  </button>
                : null}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {timeline.timelineEvents.length > 0 ?
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.productionTimeline.section.timeline")}
          </h3>
          <ul className="mt-3 space-y-2">
            {timeline.timelineEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-zinc-100 bg-white px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {t(event.titleKey as TranslationKey, {
                        ...event.titleParams,
                        kind: event.titleParams?.kind
                          ? t(`studio.productionTimeline.kind.${event.titleParams.kind}` as TranslationKey)
                          : "",
                      })}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t(categoryLabelKey(event.category))}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">{formatWhen(event.at, locale)}</span>
                </div>
                {event.toolId && onSwitchTool ?
                  <button
                    type="button"
                    onClick={() => onSwitchTool(event.toolId!)}
                    className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
                  >
                    {t("studio.productionTimeline.action.open")}
                  </button>
                : null}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {timeline.decisionHistory.length > 0 ?
        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <h3 className="text-sm font-semibold text-violet-950">
            {t("studio.productionTimeline.section.decisions")}
          </h3>
          <ul className="mt-3 space-y-2">
            {timeline.decisionHistory.map((decision) => (
              <li
                key={decision.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-900">
                  {t(decision.titleKey as TranslationKey, {
                    name: decision.name,
                    kind: t(`studio.productionTimeline.kind.${decision.kind}` as TranslationKey),
                  })}
                </span>
                <span className="text-xs text-zinc-500">{formatWhen(decision.at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      : null}

      {timeline.productionEvolution.length > 0 ?
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
          <h3 className="text-sm font-semibold text-emerald-950">
            {t("studio.productionTimeline.section.evolution")}
          </h3>
          <ul className="mt-3 space-y-2">
            {timeline.productionEvolution.map((point) => (
              <li
                key={point.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-900">
                  {t(point.titleKey as TranslationKey, point.titleParams)}
                </span>
                <span className="text-xs text-zinc-500">{formatWhen(point.at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      : null}

      {timeline.timelineEvents.length === 0 ?
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          {t("studio.productionTimeline.empty")}
        </p>
      : null}
    </div>
  );
}
