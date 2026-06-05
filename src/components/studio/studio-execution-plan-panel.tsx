"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildProviderExecutionPlan } from "@/lib/studio-provider-execution-director";
import { getStudioProvider } from "@/lib/studio-provider-registry";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  className?: string;
};

export function StudioExecutionPlanPanel({ storyboard, className = "" }: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildProviderExecutionPlan(storyboard), [storyboard]);

  if (!plan.enabled) {
    return null;
  }

  const providerLabel = (id: string) => getStudioProvider(id as never)?.name ?? id;

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-semibold text-slate-900">
        {t("studio.provider.executionPlanTitle")}
      </h3>
      <p className="mt-1 text-xs text-slate-600">{t("studio.provider.executionPlanHint")}</p>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
          <dt className="text-slate-500">{t("studio.provider.executionVoice")}</dt>
          <dd className="font-semibold text-slate-900">{providerLabel(plan.voiceProvider)}</dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
          <dt className="text-slate-500">{t("studio.provider.executionMusic")}</dt>
          <dd className="font-semibold text-slate-900">{providerLabel(plan.musicProvider)}</dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
          <dt className="text-slate-500">{t("studio.provider.executionSound")}</dt>
          <dd className="font-semibold text-slate-900">{providerLabel(plan.soundProvider)}</dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
          <dt className="text-slate-500">{t("studio.provider.executionImage")}</dt>
          <dd className="font-semibold text-slate-900">{providerLabel(plan.imageProvider)}</dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 sm:col-span-2">
          <dt className="text-slate-500">{t("studio.provider.executionVideo")}</dt>
          <dd className="font-semibold text-slate-900">{providerLabel(plan.videoProvider)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-700">
        <span>
          {t("studio.provider.estimatedCost", {
            cost: plan.estimatedTotalCostEur.toFixed(2),
            credits: String(plan.estimatedTotalCredits),
          })}
        </span>
        <span>
          {t("studio.provider.estimatedLatency", {
            seconds: String(plan.estimatedLatencySeconds),
          })}
        </span>
      </div>

      {plan.executionWarnings.length > 0 ?
        <ul className="mt-3 space-y-1 text-xs text-amber-900">
          {plan.executionWarnings.map((w, i) => (
            <li key={`${w.code}-${i}`}>{t(w.messageKey as never, w.params as never)}</li>
          ))}
        </ul>
      : null}
    </section>
  );
}
