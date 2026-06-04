"use client";

import { useActiveTranslator } from "@/i18n/client";
import { StudioStatusBadge, type StudioBadgeKind } from "@/components/studio/studio-status-badge";

type RoadmapItem = {
  labelKey:
    | "studio.roadmap.characters"
    | "studio.roadmap.locations"
    | "studio.roadmap.props"
    | "studio.roadmap.storyboards"
    | "studio.roadmap.scenes"
    | "studio.roadmap.transitions"
    | "studio.roadmap.voice"
    | "studio.roadmap.music";
  badge: StudioBadgeKind;
};

const ROADMAP_ITEMS: RoadmapItem[] = [
  { labelKey: "studio.roadmap.characters", badge: "alpha" },
  { labelKey: "studio.roadmap.locations", badge: "alpha" },
  { labelKey: "studio.roadmap.props", badge: "alpha" },
  { labelKey: "studio.roadmap.storyboards", badge: "alpha" },
  { labelKey: "studio.roadmap.scenes", badge: "alpha" },
  { labelKey: "studio.roadmap.transitions", badge: "planned" },
  { labelKey: "studio.roadmap.voice", badge: "planned" },
  { labelKey: "studio.roadmap.music", badge: "planned" },
];

export function StudioRoadmap() {
  const t = useActiveTranslator();

  return (
    <ol className="relative mt-6 space-y-0">
      {ROADMAP_ITEMS.map((item, index) => {
        const isLast = index === ROADMAP_ITEMS.length - 1;
        return (
          <li key={item.labelKey} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-gradient-to-b from-[#006D52]/40 to-[#0067B1]/20"
              />
            ) : null}
            <span
              aria-hidden
              className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#006D52] bg-white text-[10px] font-bold text-[#006D52]"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">
                  {t(item.labelKey)}
                </span>
                <StudioStatusBadge kind={item.badge} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
