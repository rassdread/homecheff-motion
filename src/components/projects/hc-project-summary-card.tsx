"use client";

import { useActiveTranslator } from "@/i18n/client";
import { resolveHcProjectServiceReadiness } from "@/lib/homecheff-project-prepare";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

import type { LibraryProjectAssetStats } from "@/lib/library-asset-index";

const SERVICES: HomeCheffProjectType[] = ["editor", "motion", "publish", "studio"];

type Props = {
  project: HomeCheffProjectPackage;
  libraryStats?: LibraryProjectAssetStats | null;
};

export function HcProjectSummaryCard({ project, libraryStats }: Props) {
  const t = useActiveTranslator();
  const stats = libraryStats ?? null;

  return (
    <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3" data-testid="hc-project-summary">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("projects.hub.summaryTitle" as never)}</p>
      {stats ?
        <dl className="mt-2 grid gap-1 sm:grid-cols-2" data-testid="hc-project-library-stats">
          <div className="flex items-center justify-between text-xs">
            <dt className="font-medium text-zinc-700">{t("library.consistency.projectStats.assets" as never)}</dt>
            <dd className="font-semibold text-zinc-900">{stats.assetCount}</dd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <dt className="font-medium text-zinc-700">{t("library.consistency.projectStats.videos" as never)}</dt>
            <dd className="font-semibold text-zinc-900">{stats.videoCount}</dd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <dt className="font-medium text-zinc-700">{t("library.consistency.projectStats.exports" as never)}</dt>
            <dd className="font-semibold text-zinc-900">{stats.exportCount}</dd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <dt className="font-medium text-zinc-700">{t("library.consistency.projectStats.characters" as never)}</dt>
            <dd className="font-semibold text-zinc-900">{stats.characterCount}</dd>
          </div>
          {stats.lastAssetActivityAt ?
            <div className="sm:col-span-2 text-xs text-zinc-500" data-testid="hc-project-last-asset-activity">
              {t("library.consistency.projectStats.lastActivity" as never)}{" "}
              {new Date(stats.lastAssetActivityAt).toLocaleString()}
            </div>
          : null}
        </dl>
      : null}
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {SERVICES.map((svc) => {
          const { ready } = resolveHcProjectServiceReadiness(project, svc);
          return (
            <li key={svc} className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-700">{t(`projects.hub.service.${svc}` as never)}</span>
              <span className={ready ? "text-emerald-700" : "text-amber-700"}>
                {ready ? t("projects.hub.readiness.ready" as never) : t("projects.hub.readiness.prepare" as never)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-zinc-500">
        {t("projects.hub.readinessHint" as never, { count: project.assetReferences.length } as never)}
      </p>
    </div>
  );
}
