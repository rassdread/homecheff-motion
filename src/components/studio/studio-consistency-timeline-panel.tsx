"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StoryboardConsistencyReport } from "@/types/studio-consistency";

type StudioConsistencyTimelinePanelProps = {
  report: StoryboardConsistencyReport | null;
};

export function StudioConsistencyTimelinePanel({
  report,
}: StudioConsistencyTimelinePanelProps) {
  const t = useActiveTranslator();

  if (!report) {
    return null;
  }

  return (
    <AppCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.consistency.timelineTitle")}
        </h2>
        <span className="text-sm font-semibold text-[#006D52]">
          {t("studio.consistency.storyboardOverall")}: {report.overallScore}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {report.timeline.map((entry) => (
          <li
            key={entry.sceneId}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm"
          >
            <span className="font-medium text-zinc-800">
              {t("studio.consistency.timelineScene", {
                order: String(entry.order + 1),
                title: entry.sceneTitle,
              })}
            </span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {entry.overallScore ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      {report.driftWarnings.length > 0 ? (
        <p className="mt-4 text-xs text-amber-800">
          {report.driftWarnings.slice(0, 3).join(" · ")}
        </p>
      ) : null}
    </AppCard>
  );
}
