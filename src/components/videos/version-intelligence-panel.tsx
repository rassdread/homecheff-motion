"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildVersionIntelligenceSummaries } from "@/lib/version-intelligence";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type Props = {
  detail: AnimationProjectDetailResponse;
};

export function VersionIntelligencePanel({ detail }: Props) {
  const t = useActiveTranslator();
  const summaries = useMemo(() => buildVersionIntelligenceSummaries(detail), [detail]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-[#0067B1]/20 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold text-zinc-900">{t("studio.aiAssistant.version.title")}</h2>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.aiAssistant.version.subtitle")}</p>
      <ul className="mt-4 space-y-3">
        {summaries.map((summary) => (
          <li key={summary.versionId} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
            <p className="text-xs font-bold text-[#0067B1]">{summary.title}</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-700">
              {summary.lines.map((line, i) => (
                <li key={i}>
                  · {t(line.messageKey as TranslationKey, line.params)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
