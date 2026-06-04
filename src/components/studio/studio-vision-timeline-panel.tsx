"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StoryboardVisionReport } from "@/types/studio-vision-consistency";

type StudioVisionTimelinePanelProps = {
  report: StoryboardVisionReport | null;
};

export function StudioVisionTimelinePanel({ report }: StudioVisionTimelinePanelProps) {
  const t = useActiveTranslator();

  if (!report) {
    return null;
  }

  return (
    <AppCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.vision.timelineTitle")}
        </h2>
        <span className="text-sm font-semibold text-[#0067B1]">
          {t("studio.vision.storyboardOverall")}: {report.overallVisionScore}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {report.timeline.map((entry) => (
          <li
            key={entry.sceneId}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm"
          >
            <span className="font-medium text-zinc-800">
              {t("studio.vision.timelineScene", {
                order: String(entry.order + 1),
                title: entry.sceneTitle,
              })}
            </span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {entry.overallVisionScore ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
