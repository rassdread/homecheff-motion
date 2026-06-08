"use client";

import { useActiveTranslator } from "@/i18n/client";

export type AssetReadinessDomainView = {
  id: string;
  labelKey: string;
  status: "pass" | "warning" | "missing";
  detailKey?: string;
};

type Props = {
  overallScore: number;
  overallTier: "complete" | "almost" | "missing";
  nextStepKey: string;
  domains: AssetReadinessDomainView[];
};

const STATUS_STYLES = {
  pass: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  missing: "bg-red-100 text-red-900",
} as const;

export function StudioAssetSummaryReadinessPanel({
  overallScore,
  overallTier,
  nextStepKey,
  domains,
}: Props) {
  const t = useActiveTranslator();

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-zinc-900">{t("studio.assetReadiness.title")}</h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
          {overallScore}% · {t(`studio.assetReadiness.tier.${overallTier}` as never)}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-600">{t(nextStepKey as never)}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {domains.map((domain) => (
          <li
            key={domain.id}
            className={`rounded-lg px-3 py-2 text-xs ${STATUS_STYLES[domain.status]}`}
          >
            <span className="font-semibold">{t(domain.labelKey as never)}</span>
            {domain.detailKey ?
              <p className="mt-0.5 opacity-90">{t(domain.detailKey as never)}</p>
            : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
