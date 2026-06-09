"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { SuiteFlowAction } from "@/lib/suite-flow-handoffs";

type Props = {
  titleKey: string;
  actions: SuiteFlowAction[];
};

export function SuiteFlowActions({ titleKey, actions }: Props) {
  const t = useActiveTranslator();
  if (actions.length === 0) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
      <p className="text-sm font-semibold text-emerald-950">{t(titleKey as never)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((a) => (
          <Link key={a.id} href={a.href} prefetch={false} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">
            {t(a.labelKey as never)}
          </Link>
        ))}
      </div>
    </div>
  );
}
