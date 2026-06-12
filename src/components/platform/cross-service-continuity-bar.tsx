"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildHcContinuityHandoffUrl, suggestHcProjectNextStep } from "@/lib/hc-project-continuity";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { useActiveTranslator } from "@/i18n/client";
import type { HomeCheffProjectType } from "@/types/homecheff-project-package";

const SERVICES: HomeCheffProjectType[] = ["editor", "motion", "publish", "studio"];

type Props = {
  hcProjectId?: string;
  currentService?: HomeCheffProjectType;
  showProjects?: boolean;
  showLibrary?: boolean;
};

export function CrossServiceContinuityBar({
  hcProjectId,
  currentService,
  showProjects = true,
  showLibrary = true,
}: Props) {
  const t = useActiveTranslator();
  const project = useMemo(() => (hcProjectId ? loadHomeCheffProject(hcProjectId) : null), [hcProjectId]);

  if (!hcProjectId || !project) return null;

  const targets = SERVICES.filter((s) => s !== currentService);
  const nextStep = suggestHcProjectNextStep(project);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2" data-testid="cross-service-continuity">
      <span className="text-xs font-semibold text-emerald-900">{t("platform.continuity.label" as never)}</span>
      {nextStep ?
        <span className="text-xs text-emerald-800">{t(nextStep.labelKey as never)}</span>
      : null}
      {targets.map((service) => (
        <Link
          key={service}
          href={buildHcContinuityHandoffUrl(project, service)}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          {t(`platform.continuity.open.${service}` as never)}
        </Link>
      ))}
      {showProjects ?
        <Link
          href={`/projects?hcProject=${encodeURIComponent(hcProjectId)}`}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          {t("platform.continuity.open.projects" as never)}
        </Link>
      : null}
      {showLibrary ?
        <Link
          href={`/library/start?hcProject=${encodeURIComponent(hcProjectId)}`}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          {t("platform.continuity.saveLibrary" as never)}
        </Link>
      : null}
    </div>
  );
}
