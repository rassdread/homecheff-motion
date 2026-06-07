"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildStoryboardIdentityConsumption,
  type IdentityConsumptionLibraries,
  type StoryboardIdentityConsumption,
} from "@/lib/studio-identity-consumption";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  storyboard: StudioStoryboardDetail;
  libraries: IdentityConsumptionLibraries;
  memory?: StudioProjectMemorySnapshot | null;
  consumption?: StoryboardIdentityConsumption;
  variant?: "full" | "compact";
  showTrends?: boolean;
  showConsistency?: boolean;
};

const KIND_LABEL_KEYS: Record<string, TranslationKey> = {
  character: "studio.identityConsumption.kind.character",
  location: "studio.identityConsumption.kind.location",
  prop: "studio.identityConsumption.kind.prop",
  world: "studio.identityConsumption.kind.world",
};

function statusIcon(status: "pass" | "partial" | "missing"): string {
  if (status === "pass") return "✓";
  if (status === "partial") return "⚠";
  return "○";
}

export function StudioIdentityConsumptionSummary({
  storyboard,
  libraries,
  memory,
  consumption: consumptionProp,
  variant = "full",
  showTrends = true,
  showConsistency = true,
}: Props) {
  const t = useActiveTranslator();

  const consumption = useMemo(
    () =>
      consumptionProp ??
      buildStoryboardIdentityConsumption({
        storyboard,
        libraries,
        memory,
      }),
    [consumptionProp, storyboard, libraries, memory]
  );

  if (consumption.assetSummaries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.identityConsumption.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.identityConsumption.subtitle")}</p>

      {consumption.rationales.length > 0 ?
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.whyRecommended")}
          </p>
          <ul className="space-y-1.5">
            {consumption.rationales.slice(0, variant === "compact" ? 3 : 6).map((r) => (
              <li key={r.id} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-700">
                <span className="font-medium text-[#0067B1]">
                  {t(KIND_LABEL_KEYS[r.sourceKind] ?? "studio.identityConsumption.kind.asset")}
                  {": "}
                  {r.sourceName}
                </span>
                <span className="mt-0.5 block text-zinc-600">
                  {t(r.reasonKey as TranslationKey, r.reasonParams)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {variant === "full" && consumption.visualProductionLines.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.visualInUse")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-600">
            {consumption.visualProductionLines.slice(0, 4).map((line) => (
              <li key={line} className="rounded bg-white/70 px-2 py-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {variant === "full" && consumption.audioProductionLines.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.audioInUse")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-600">
            {consumption.audioProductionLines.slice(0, 3).map((line) => (
              <li key={line} className="rounded bg-white/70 px-2 py-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {showConsistency && consumption.consistencyChecks.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.rulesFollowed")}
          </p>
          <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {consumption.consistencyChecks.map((check) => (
              <li
                key={`${check.kind}-${check.id}`}
                className={`rounded-lg px-3 py-2 text-xs ${
                  check.status === "pass" ?
                    "bg-white font-medium text-[#006D52]"
                  : check.status === "partial" ?
                    "bg-amber-50 text-amber-900"
                  : "bg-white/50 text-zinc-400"
                }`}
              >
                {statusIcon(check.status)}{" "}
                {t(KIND_LABEL_KEYS[check.kind] ?? "studio.identityConsumption.kind.asset")}
                {": "}
                {check.name}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {showTrends && consumption.trends.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.trends")}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {consumption.trends.map((trend) => (
              <li
                key={trend.id}
                className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-zinc-700"
              >
                {t(trend.messageKey as TranslationKey, { label: trend.label, count: String(trend.count) })}
              </li>
            ))}
          </ul>
        </div>
      : null}
    </section>
  );
}
