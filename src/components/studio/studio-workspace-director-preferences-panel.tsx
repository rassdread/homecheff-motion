"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildDirectorDecisionMemory } from "@/lib/studio-director-decision-memory";
import { loadDirectorDecisionRegistry } from "@/lib/studio-director-decision-storage";
import type { DirectorApplyAuditRecord } from "@/types/studio-director-decision-memory";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
};

function auditTitleKey(audit: DirectorApplyAuditRecord): TranslationKey {
  switch (audit.kind) {
    case "director_applied":
      return "studio.productionTimeline.event.directorApplied";
    case "director_partially_applied":
      return "studio.productionTimeline.event.directorPartiallyApplied";
    case "director_modified":
      return "studio.productionTimeline.event.directorModified";
    case "director_rejected":
      return "studio.productionTimeline.event.directorRejected";
    default:
      return "studio.productionTimeline.event.directorApplied";
  }
}

export function StudioWorkspaceDirectorPreferencesPanel({ storyboard }: Props) {
  const t = useActiveTranslator();

  const { memory, audits } = useMemo(() => {
    const registry = loadDirectorDecisionRegistry(storyboard.id);
    const built = buildDirectorDecisionMemory({
      storyboardId: storyboard.id,
      storyboard,
      audits: registry.audits,
      applyBaseline: registry.applyBaseline,
    });
    return { memory: built, audits: registry.audits.slice(0, 8) };
  }, [storyboard]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.directorPreferences.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.directorPreferences.subtitle")}</p>
      </div>

      {memory.proposalRetentionLabelKey ?
        <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <h3 className="text-sm font-semibold text-sky-950">
            {t("studio.directorPreferences.section.retention")}
          </h3>
          <p className="mt-2 text-sm text-sky-900">
            {t(memory.proposalRetentionLabelKey as TranslationKey, {
              score: String(memory.proposalRetentionScore ?? 0),
            })}
          </p>
        </section>
      : null}

      {memory.preferredSceneCountMin != null && memory.preferredSceneCountMax != null ?
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
          <h3 className="text-sm font-semibold text-indigo-950">
            {t("studio.directorPreferences.section.sceneCount")}
          </h3>
          <p className="mt-2 text-sm text-indigo-900">
            {t("studio.directorDecision.recommend.sceneCount", {
              min: String(memory.preferredSceneCountMin),
              max: String(memory.preferredSceneCountMax),
            })}
          </p>
        </section>
      : null}

      {memory.learningSummaryKeys.length > 0 ?
        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <h3 className="text-sm font-semibold text-violet-950">
            {t("studio.directorPreferences.section.learning")}
          </h3>
          <ul className="mt-3 space-y-2">
            {memory.learningSummaryKeys.map((key) => (
              <li key={key} className="rounded-lg bg-white/90 px-3 py-2 text-sm text-violet-950">
                {t(key as TranslationKey)}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {memory.oftenRemovedStructures.length > 0 ?
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.directorPreferences.section.oftenRemoved")}
          </h3>
          <ul className="mt-3 space-y-2">
            {memory.oftenRemovedStructures.map((pattern) => (
              <li
                key={pattern.id}
                className="flex items-center justify-between rounded-lg bg-white/90 px-3 py-2 text-xs"
              >
                <span>{t(pattern.labelKey as TranslationKey, pattern.params)}</span>
                <span className="font-semibold text-amber-900">×{pattern.count}</span>
              </li>
            ))}
          </ul>
        </section>
      : null}

      {audits.length > 0 ?
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.directorPreferences.section.recentDecisions")}
          </h3>
          <ul className="mt-3 space-y-2">
            {audits.map((audit) => (
              <li key={audit.id} className="rounded-lg bg-white px-3 py-2 text-xs text-zinc-700">
                <span className="font-medium text-zinc-900">
                  {t(auditTitleKey(audit), {
                    scenes: String(audit.proposalSceneCount),
                    applied: String(audit.appliedSceneCount ?? audit.proposalSceneCount),
                    changes: String(audit.changes.length),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      : null}

      {memory.auditCount === 0 ?
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
          {t("studio.directorPreferences.empty")}
        </p>
      : null}
    </div>
  );
}
