"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GenerationPackageBrowser } from "@/components/projects/generation-package-browser";
import { HcProjectSummaryCard } from "@/components/projects/hc-project-summary-card";
import { HcProjectPrepareDialog } from "@/components/projects/hc-project-prepare-dialog";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { buildHcHandoffUrl, resolveHcProjectOpenTargets } from "@/lib/homecheff-project-package-core";
import {
  archiveHcProject,
  deleteHcProject,
  duplicateHcProject,
  listHomeCheffProjectsFiltered,
  loadHomeCheffProject,
  restoreHcProject,
} from "@/lib/homecheff-project-persist";
import { listUnifiedProjects } from "@/lib/homecheff-project-list";
import { loadHcProjectResolved } from "@/lib/homecheff-project-sync";
import { resolveHcProjectLastService } from "@/lib/homecheff-project-state";
import { archiveLegacyProject, restoreLegacyProject } from "@/lib/homecheff-project-legacy-registry";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { HomeCheffProjectListFilter, HomeCheffProjectType } from "@/types/homecheff-project-package";

const FILTERS: HomeCheffProjectListFilter[] = ["active", "hc", "legacy", "archived"];

const SERVICE_OPEN_LABEL: Record<string, string> = {
  editor: "hcProject.openEditor",
  motion: "hcProject.openMotion",
  publish: "hcProject.openPublish",
  studio: "hcProject.openStudio",
};

export function HomeCheffProjectHub() {
  const t = useActiveTranslator();
  const router = useRouter();
  const auth = useAuthSession();
  const [filter, setFilter] = useState<HomeCheffProjectListFilter>("active");
  const [refreshKey, setRefreshKey] = useState(0);
  const [prepareTarget, setPrepareTarget] = useState<{ projectId: string; target: HomeCheffProjectType } | null>(null);

  const items = useMemo(() => {
    void refreshKey;
    return listUnifiedProjects(filter);
  }, [filter, refreshKey]);

  const continueItem = useMemo(() => {
    void refreshKey;
    const active = listUnifiedProjects("active");
    return active[0] ?? null;
  }, [refreshKey]);

  const bump = () => setRefreshKey((k) => k + 1);

  const openHc = async (projectId: string, service?: HomeCheffProjectType) => {
    if (auth.user) {
      await loadHcProjectResolved(projectId, { syncFromServer: true });
    }
    const project = loadHomeCheffProject(projectId);
    const target = service ?? resolveHcProjectOpenTargets(project ?? { id: projectId, projectType: "editor" } as never)[0] ?? "editor";
    if (project && !project.servicePayload[target as keyof typeof project.servicePayload]) {
      setPrepareTarget({ projectId, target });
      return;
    }
    router.push(buildHcHandoffUrl(projectId, target));
  };

  return (
    <StudioAuthGate authTitleKey="projects.authTitle" authBodyKey="projects.authBody">
      <main className={`flex-1 ${studioVisual.pageBg}`}>
        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <p className={`text-xs font-semibold uppercase tracking-widest ${studioVisual.eyebrowOnDark}`}>
            {t("platform.hub.projectHub" as never)}
          </p>
          <h1 className={`mt-1 text-2xl sm:text-3xl ${studioVisual.headingOnDark}`}>{t("projects.hub.title" as never)}</h1>
          <p className={`mt-2 max-w-2xl text-sm ${studioVisual.bodyOnDark}`}>{t("projects.hub.lead" as never)}</p>
          <p className={`mt-1 text-xs ${studioVisual.bodyOnDark}`}>{t("projects.hub.explainer" as never)}</p>

          {continueItem ?
            <div className={`mt-6 ${studioVisual.cardOnDarkMuted}`}>
              <h2 className={`text-sm font-bold ${studioVisual.subheadingOnDark}`}>{t("projects.hub.continue" as never)}</h2>
              <p className={`mt-1 text-sm ${studioVisual.bodyOnDark}`}>
                {continueItem.kind === "hc"
                  ? continueItem.project.title
                  : continueItem.entry.title}
              </p>
              <button
                type="button"
                className={`mt-3 ${studioVisual.btnGradientPrimary}`}
                onClick={() => {
                  if (continueItem.kind === "hc") {
                    void openHc(continueItem.project.id, resolveHcProjectLastService(continueItem.project));
                  } else {
                    router.push(continueItem.entry.openPath ?? `/animate/${continueItem.entry.legacyId}`);
                  }
                }}
              >
                {t("projects.hub.continueAction" as never)}
              </button>
            </div>
          : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={filter === f ? studioVisual.editorTabActive : studioVisual.editorTabInactive}
              >
                {t(`projects.hub.filter.${f}` as never)}
              </button>
            ))}
          </div>

          <ul className="mt-6 space-y-3">
            {items.length === 0 ?
              <li className={`p-8 text-center ${studioVisual.cardOnDarkMuted}`}>
                <p className={`text-sm ${studioVisual.subheadingOnDark}`}>{t("projects.hub.emptyTitle" as never)}</p>
                <p className={`mt-2 text-sm ${studioVisual.bodyOnDark}`}>{t("projects.hub.empty" as never)}</p>
              </li>
            : items.map((item) => {
                if (item.kind === "hc") {
                  const project = item.project;
                  const targets = resolveHcProjectOpenTargets(project);
                  return (
                    <li
                      key={project.id}
                      className={studioVisual.hubCard}
                      data-testid={`hc-project-card-${project.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900">{project.title}</h3>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {t("projects.hub.lastService" as never, {
                              service: resolveHcProjectLastService(project),
                            } as never)}{" "}
                            · {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <HcProjectStateBadge project={project} compact />
                      </div>
                      <HcProjectSummaryCard project={project} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => void openHc(project.id)}>
                          {t("projects.hub.continueAction" as never)}
                        </button>
                        {targets.map((svc) => (
                          <button
                            key={svc}
                            type="button"
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:border-[#0067B1]"
                            onClick={() => void openHc(project.id, svc)}
                          >
                            {t((SERVICE_OPEN_LABEL[svc] ?? "hcProject.open") as never)}
                          </button>
                        ))}
                        {project.isArchived ?
                          <button type="button" className={studioVisual.btnOutline} onClick={() => { restoreHcProject(project.id); bump(); }}>
                            {t("hcLegacy.action.restore" as never)}
                          </button>
                        : <button type="button" className={studioVisual.btnOutline} onClick={() => { archiveHcProject(project.id); bump(); }}>
                            {t("hcLegacy.action.archive" as never)}
                          </button>
                        }
                        <button type="button" className={studioVisual.btnOutline} onClick={() => { duplicateHcProject(project.id); bump(); }}>
                          {t("projects.hub.duplicate" as never)}
                        </button>
                        <button type="button" className={studioVisual.btnOutline} onClick={() => { deleteHcProject(project.id); bump(); }}>
                          {t("projects.hub.delete" as never)}
                        </button>
                      </div>
                    </li>
                  );
                }

                const entry = item.entry;
                return (
                  <li key={`${entry.service}:${entry.legacyId}`} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                    <h3 className="text-sm font-bold text-zinc-900">{entry.title}</h3>
                    <p className="text-xs text-amber-900">{t("hcLegacy.badge.label" as never)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={entry.openPath ?? "#"} className={studioVisual.btnOutline}>
                        {t("hcLegacy.action.open" as never)}
                      </Link>
                      {entry.linkedHcProjectId ?
                        <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => void openHc(entry.linkedHcProjectId!)}>
                          {t("projects.hub.openHc" as never)}
                        </button>
                      : null}
                      {entry.isArchived ?
                        <button type="button" className={studioVisual.btnOutline} onClick={() => { restoreLegacyProject(entry.service, entry.legacyId); bump(); }}>
                          {t("hcLegacy.action.restore" as never)}
                        </button>
                      : <button type="button" className={studioVisual.btnOutline} onClick={() => { archiveLegacyProject(entry.service, entry.legacyId); bump(); }}>
                          {t("hcLegacy.action.archive" as never)}
                        </button>
                      }
                    </div>
                  </li>
                );
              })
            }
          </ul>

          <div className={`mt-10 ${studioVisual.cardOnDarkMuted} p-5`}>
            <GenerationPackageBrowser />
          </div>
        </section>
      </main>
      {prepareTarget ?
        <HcProjectPrepareDialog
          projectId={prepareTarget.projectId}
          target={prepareTarget.target}
          onClose={() => setPrepareTarget(null)}
          onReady={(href) => {
            setPrepareTarget(null);
            router.push(href);
          }}
        />
      : null}
    </StudioAuthGate>
  );
}
