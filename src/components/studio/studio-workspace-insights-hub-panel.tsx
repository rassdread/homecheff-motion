"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildStudioInsightsHubView } from "@/lib/studio-insights-hub";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  InsightsHealthDomain,
  InsightsHealthStatus,
  InsightsProjectPhaseStep,
} from "@/types/studio-insights-hub";
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
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory: StudioProjectMemorySnapshot | null;
  styleProfile?: string;
  directorProfile?: string;
  onSwitchTool?: (tool: StudioToolId) => void;
};

function phaseStepClass(step: InsightsProjectPhaseStep): string {
  if (step.status === "current") {
    return "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1] font-semibold";
  }
  if (step.status === "completed") {
    return "border-emerald-200 bg-emerald-50/80 text-emerald-900";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function healthBadgeClass(status: InsightsHealthStatus): string {
  switch (status) {
    case "pass":
      return "bg-emerald-100 text-emerald-900";
    case "warning":
      return "bg-amber-100 text-amber-950";
    case "missing":
      return "bg-rose-100 text-rose-950";
  }
}

function healthStatusKey(status: InsightsHealthStatus): TranslationKey {
  switch (status) {
    case "pass":
      return "studio.insightsHub.health.status.pass";
    case "warning":
      return "studio.insightsHub.health.status.warning";
    case "missing":
      return "studio.insightsHub.health.status.missing";
  }
}

function HealthRow({
  domain,
  onSwitchTool,
}: {
  domain: InsightsHealthDomain;
  onSwitchTool?: (tool: StudioToolId) => void;
}) {
  const t = useActiveTranslator();
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white/90 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">
          {t(domain.labelKey as TranslationKey)}
        </p>
        {domain.detailKey ?
          <p className="mt-0.5 truncate text-xs text-zinc-600">
            {t(domain.detailKey as TranslationKey)}
          </p>
        : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${healthBadgeClass(domain.status)}`}
        >
          {t(healthStatusKey(domain.status))}
        </span>
        {domain.toolId && onSwitchTool ?
          <button
            type="button"
            onClick={() => onSwitchTool(domain.toolId!)}
            className="text-[11px] font-semibold text-[#0067B1] hover:underline"
          >
            {t("studio.insightsHub.action.open")}
          </button>
        : null}
      </div>
    </li>
  );
}

export function StudioWorkspaceInsightsHubPanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  projectMemory,
  styleProfile,
  directorProfile,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const view = useMemo(
    () =>
      buildStudioInsightsHubView({
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.insightsHub.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.insightsHub.subtitle")}</p>
      </div>

      <section className="rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/5 to-[#006D52]/5 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.insightsHub.section.projectPhase")}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {view.projectPhases.map((step) => (
            <span
              key={step.id}
              className={`rounded-full border px-3 py-1 text-xs ${phaseStepClass(step)}`}
            >
              {t(step.labelKey as TranslationKey)}
            </span>
          ))}
        </div>
      </section>

      {view.nextBestAction ?
        <section className="rounded-2xl border border-violet-300 bg-violet-50/70 p-4">
          <h3 className="text-sm font-semibold text-violet-950">
            {t("studio.insightsHub.section.nextStep")}
          </h3>
          <p className="mt-2 text-sm text-violet-950">
            {t(view.nextBestAction.messageKey as TranslationKey, view.nextBestAction.messageParams)}
          </p>
          <p className="mt-1 text-xs text-violet-800">
            {t("studio.insightsHub.why.source")}:{" "}
            {t(view.nextBestAction.sourceLabelKey as TranslationKey)}
          </p>
          {view.nextBestAction.toolId && onSwitchTool ?
            <button
              type="button"
              onClick={() => onSwitchTool(view.nextBestAction!.toolId!)}
              className="mt-3 rounded-full bg-violet-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
            >
              {t("studio.insightsHub.action.go")}
            </button>
          : null}
        </section>
      : null}

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.insightsHub.section.health")}
        </h3>
        <ul className="mt-3 space-y-2">
          {view.healthDomains.map((domain) => (
            <HealthRow key={domain.id} domain={domain} onSwitchTool={onSwitchTool} />
          ))}
        </ul>
      </section>

      {view.explanations.length > 0 ?
        <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <h3 className="text-sm font-semibold text-sky-950">
            {t("studio.insightsHub.section.why")}
          </h3>
          <ul className="mt-3 space-y-3">
            {view.explanations.map((item) => (
              <li key={item.id} className="rounded-lg bg-white/90 px-3 py-2.5">
                <p className="text-sm text-sky-950">
                  {t(item.messageKey as TranslationKey, item.messageParams)}
                </p>
                <p className="mt-1 text-xs text-sky-800">
                  {t("studio.insightsHub.why.source")}:{" "}
                  {t(item.sourceLabelKey as TranslationKey)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      : null}

      {view.learningLines.length > 0 ?
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
          <h3 className="text-sm font-semibold text-indigo-950">
            {t("studio.insightsHub.section.learning")}
          </h3>
          <ul className="mt-3 space-y-2">
            {view.learningLines.map((line) => (
              <li key={line.id} className="rounded-lg bg-white/90 px-3 py-2 text-sm text-indigo-950">
                {t(line.messageKey as TranslationKey, line.messageParams)}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {view.voiceCastSummary ?
        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <h3 className="text-sm font-semibold text-violet-950">
            {t("studio.insightsHub.section.voiceCast")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-violet-950">
            <li className="rounded-lg bg-white/90 px-3 py-2">
              {t("studio.insightsHub.voiceCast.characters", {
                count: String(view.voiceCastSummary.characterCount),
              })}
            </li>
            <li className="rounded-lg bg-white/90 px-3 py-2">
              {t("studio.insightsHub.voiceCast.voices", {
                count: String(view.voiceCastSummary.voiceAssignedCount),
              })}
            </li>
            <li className="rounded-lg bg-white/90 px-3 py-2">
              {t("studio.insightsHub.voiceCast.breakdown", {
                clones: String(view.voiceCastSummary.cloneCount),
                personas: String(view.voiceCastSummary.personaCount),
                presets: String(view.voiceCastSummary.presetCount),
              })}
            </li>
            <li className="rounded-lg bg-white/90 px-3 py-2">
              {t(view.voiceCastSummary.dialogueReadinessLabelKey as TranslationKey)}
            </li>
            {view.voiceCastSummary.missingVoiceCount > 0 ?
              <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                {t("studio.insightsHub.voiceCast.missing", {
                  names: view.voiceCastSummary.missingVoiceNames.join(", "),
                })}
              </li>
            : null}
          </ul>
        </section>
      : null}

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
        <h3 className="text-sm font-semibold text-amber-950">
          {t("studio.insightsHub.section.snapshots")}
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-amber-950">
          {view.snapshotSummary.recoveryPoint ?
            <li className="rounded-lg bg-white/90 px-3 py-2">
              <span className="font-medium">{t("studio.insightsHub.snapshot.recovery")}: </span>
              {t(
                view.snapshotSummary.recoveryPoint.labelKey as TranslationKey,
                view.snapshotSummary.recoveryPoint.labelParams
              )}
              {view.snapshotSummary.recoveryPoint.isStale ?
                ` · ${t("studio.snapshot.recovery.stale")}`
              : ""}
            </li>
          : (
            <li className="rounded-lg bg-white/90 px-3 py-2 text-amber-900/80">
              {t("studio.insightsHub.snapshot.noRecovery")}
            </li>
          )}
          {view.snapshotSummary.lastMajorChangeKey ?
            <li className="rounded-lg bg-white/90 px-3 py-2">
              <span className="font-medium">{t("studio.insightsHub.snapshot.lastChange")}: </span>
              {t(
                view.snapshotSummary.lastMajorChangeKey as TranslationKey,
                view.snapshotSummary.lastMajorChangeParams
              )}
            </li>
          : null}
          {view.snapshotSummary.lastDirectorApplyKey ?
            <li className="rounded-lg bg-white/90 px-3 py-2">
              <span className="font-medium">{t("studio.insightsHub.snapshot.lastDirector")}: </span>
              {t(
                view.snapshotSummary.lastDirectorApplyKey as TranslationKey,
                view.snapshotSummary.lastDirectorApplyParams
              )}
            </li>
          : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.insightsHub.section.timeline")}
        </h3>
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          <p>
            {t("studio.insightsHub.timeline.today", {
              count: String(view.timelineSummary.todayCount),
            })}
          </p>
          <p>
            {t("studio.insightsHub.timeline.week", {
              count: String(view.timelineSummary.weekCount),
            })}
          </p>
          {view.timelineSummary.highlightKey ?
            <p className="rounded-lg bg-white px-3 py-2">
              <span className="font-medium text-zinc-900">
                {t("studio.insightsHub.timeline.highlight")}:{" "}
              </span>
              {t(
                view.timelineSummary.highlightKey as TranslationKey,
                view.timelineSummary.highlightParams
              )}
            </p>
          : null}
        </div>
        {onSwitchTool ?
          <button
            type="button"
            onClick={() => onSwitchTool("productionHistory")}
            className="mt-3 text-sm font-semibold text-[#0067B1] hover:underline"
          >
            {t("studio.insightsHub.action.openHistory")}
          </button>
        : null}
      </section>
    </div>
  );
}
