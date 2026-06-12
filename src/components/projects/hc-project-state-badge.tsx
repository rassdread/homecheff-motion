"use client";

import { useActiveTranslator } from "@/i18n/client";
import { resolveHcProjectStateIndicators } from "@/lib/homecheff-project-state";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  project: HomeCheffProjectPackage | null;
  compact?: boolean;
};

export function HcProjectStateBadge({ project, compact = false }: Props) {
  const t = useActiveTranslator();
  if (!project) return null;

  const states = resolveHcProjectStateIndicators(project);

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2"
      }
      data-testid="hc-project-state-badge"
    >
      {!compact ?
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-sky-900">
          {t("hcProject.badge.title" as never)}
        </p>
      : null}
      <div className="flex flex-wrap gap-1.5">
        {states.map((state) => (
          <span
            key={state.service}
            className={
              state.available
                ? "inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900"
                : "inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400"
            }
          >
            {t(state.labelKey as never)} {state.available ? "✓" : "✗"}
          </span>
        ))}
      </div>
    </div>
  );
}
