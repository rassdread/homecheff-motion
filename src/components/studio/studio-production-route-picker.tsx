"use client";

import { useActiveTranslator } from "@/i18n/client";
import { estimateProductionRouteCredits } from "@/lib/studio-production-route";
import type { StudioProductionRoute } from "@/types/studio-production-brief-v3";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";

const ROUTES: StudioProductionRoute[] = ["prompt_only", "asset_first", "mixed"];

type Props = {
  storyPlan: StudioStoryPlan;
  value: StudioProductionRoute;
  onChange: (route: StudioProductionRoute) => void;
  aiEverythingMode?: boolean;
};

export function StudioProductionRoutePicker({ storyPlan, value, onChange, aiEverythingMode }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-3" data-testid="studio-production-route-picker">
      <h3 className="text-sm font-semibold text-zinc-900">{t("studio.productionRoute.title" as never)}</h3>
      <p className="text-xs text-zinc-600">{t("studio.productionRoute.lead" as never)}</p>
      {aiEverythingMode ?
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          {t("studio.briefV4.aiEverything.routeHint" as never)}
        </p>
      : null}
      <div className="grid gap-2">
        {ROUTES.map((route) => {
          const estimate = estimateProductionRouteCredits(route, storyPlan);
          const active = value === route;
          return (
            <button
              key={route}
              type="button"
              onClick={() => onChange(route)}
              className={`rounded-xl border p-3 text-left ${active ? "border-[#006D52] bg-emerald-50" : "border-zinc-200 bg-white"}`}
            >
              <p className="text-sm font-semibold text-zinc-900">{t(`studio.productionRoute.${route}.title` as never)}</p>
              <p className="mt-1 text-xs text-zinc-600">{t(`studio.productionRoute.${route}.desc` as never)}</p>
              <p className="mt-2 text-xs font-medium text-emerald-800">
                {t(estimate.labelKey as never, { total: estimate.totalCredits } as never)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
