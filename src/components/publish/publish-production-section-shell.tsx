"use client";

import type { ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  titleKey: string;
  summary?: string;
  emptyLabelKey?: string;
  active?: boolean;
  children: ReactNode;
  testId?: string;
};

export function PublishProductionSectionShell({
  titleKey,
  summary,
  emptyLabelKey,
  active = false,
  children,
  testId,
}: Props) {
  const t = useActiveTranslator();

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{t(titleKey as never)}</h3>
        {active ?
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            {t("publish.media.badge.active" as never)}
          </span>
        : emptyLabelKey ?
          <span className="text-xs text-zinc-500">{t(emptyLabelKey as never)}</span>
        : null}
      </div>
      {summary ?
        <p className="mt-1 text-sm font-medium text-[#0067B1]">{summary}</p>
      : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
