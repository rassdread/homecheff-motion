"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { listStudioProviders } from "@/lib/studio-provider-registry";
import { resolveFallbackProviderId } from "@/lib/studio-provider-fallback";
import type { StudioProviderType } from "@/types/studio-provider-execution";

const FILTER_TYPES: Array<StudioProviderType | "all"> = [
  "all",
  "voice",
  "music",
  "sound",
  "image",
  "video",
];

type Props = {
  className?: string;
};

export function StudioProviderManagerPanel({ className = "" }: Props) {
  const t = useActiveTranslator();
  const [filter, setFilter] = useState<StudioProviderType | "all">("all");

  const rows = useMemo(
    () =>
      listStudioProviders({
        providerType: filter === "all" ? undefined : filter,
        enabledOnly: false,
      }),
    [filter]
  );

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-slate-50/60 p-4 ${className}`}
    >
      <h3 className="text-sm font-semibold text-slate-900">
        {t("studio.provider.managerTitle")}
      </h3>
      <p className="mt-1 text-xs text-slate-600">{t("studio.provider.managerHint")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTER_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === type
                ? "bg-[#006D52] text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {type === "all"
              ? t("studio.provider.filterAll")
              : t(`studio.provider.type.${type}` as never)}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3 font-semibold">{t("studio.provider.colName")}</th>
              <th className="py-2 pr-3 font-semibold">{t("studio.provider.colType")}</th>
              <th className="py-2 pr-3 font-semibold">{t("studio.provider.colStatus")}</th>
              <th className="py-2 pr-3 font-semibold">{t("studio.provider.colPriority")}</th>
              <th className="py-2 pr-3 font-semibold">{t("studio.provider.colFallback")}</th>
              <th className="py-2 font-semibold">{t("studio.provider.colCostTracking")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fallback = resolveFallbackProviderId(row.id, row.providerType);
              return (
                <tr key={row.id} className="border-b border-slate-100 text-slate-800">
                  <td className="py-2 pr-3 font-medium">{row.name}</td>
                  <td className="py-2 pr-3">{t(`studio.provider.type.${row.providerType}` as never)}</td>
                  <td className="py-2 pr-3">{t(`studio.provider.status.${row.status}` as never)}</td>
                  <td className="py-2 pr-3">{row.priority}</td>
                  <td className="py-2 pr-3">{fallback ?? "—"}</td>
                  <td className="py-2">
                    {row.costTrackingEnabled
                      ? t("studio.provider.costTrackingYes")
                      : t("studio.provider.costTrackingNo")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
