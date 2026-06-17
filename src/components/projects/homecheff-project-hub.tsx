"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GenerationPackageBrowser } from "@/components/projects/generation-package-browser";
import { HcProjectDeleteDialog } from "@/components/projects/hc-project-delete-dialog";
import { HcProjectHubCard } from "@/components/projects/hc-project-hub-card";
import { HcProjectImportButton } from "@/components/projects/hc-project-import-button";
import { HcProjectPrepareDialog } from "@/components/projects/hc-project-prepare-dialog";
import { RecentLocalEditsPanel } from "@/components/projects/recent-local-edits-panel";
import { ConversionSurface } from "@/components/billing/conversion-surface";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import {
  bulkArchiveHcProjectRecords,
  bulkDeleteHcProjectRecords,
  hcProjectHasExportedResults,
  permanentlyDeleteHcProjectRecord,
} from "@/lib/hc-project-delete-archive";
import { buildHcHandoffUrl, resolveHcProjectOpenTargets } from "@/lib/homecheff-project-package-core";
import {
  listHcProjectsByWorkflowStatus,
  type HcProjectWorkflowStatus,
} from "@/lib/hc-project-lifecycle";
import {
  listHomeCheffProjectsFiltered,
  loadHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import { listUnifiedProjects } from "@/lib/homecheff-project-list";
import { listRecentLocalEdits } from "@/lib/recent-local-edits";
import { loadHcProjectResolved } from "@/lib/homecheff-project-sync";
import { queryLibraryConsistency } from "@/lib/library-consistency-client";
import type { LibraryProjectAssetStats } from "@/lib/library-asset-index";
import { resolveHcProjectLastService } from "@/lib/homecheff-project-state";
import { archiveLegacyProject, restoreLegacyProject } from "@/lib/homecheff-project-legacy-registry";
import { StudioPageIntro } from "@/components/suite/studio-page-intro";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { HomeCheffProjectListFilter, HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

const LEGACY_FILTERS: HomeCheffProjectListFilter[] = ["legacy", "archived"];

const WORKFLOW_FILTERS: Array<HcProjectWorkflowStatus | "active"> = [
  "active",
  "concept",
  "in_progress",
  "motion_ready",
  "publish_ready",
  "exported",
  "archived",
];

type DeleteTarget = {
  projectId: string;
  projectTitle: string;
  showExportedWarning: boolean;
};

export function HomeCheffProjectHub() {
  const t = useActiveTranslator();
  const router = useRouter();
  const auth = useAuthSession();
  const [filter, setFilter] = useState<HomeCheffProjectListFilter | HcProjectWorkflowStatus | "active">("active");
  const [refreshKey, setRefreshKey] = useState(0);
  const [prepareTarget, setPrepareTarget] = useState<{ projectId: string; target: HomeCheffProjectType } | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [liveProjects, setLiveProjects] = useState<Record<string, HomeCheffProjectPackage>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [projectLibraryStats, setProjectLibraryStats] = useState<Record<string, LibraryProjectAssetStats>>({});

  useEffect(() => {
    if (!auth.user?.id) {
      return;
    }
    void (async () => {
      const response = await queryLibraryConsistency({ limit: 500 });
      if (response.ok && response.projectStats) {
        setProjectLibraryStats(response.projectStats);
      }
    })();
  }, [auth.user?.id, refreshKey]);

  const items = useMemo(() => {
    void refreshKey;
    if (filter === "legacy") {
      return listUnifiedProjects(filter);
    }
    if (filter === "archived") {
      const hcArchived = listHcProjectsByWorkflowStatus(
        listHomeCheffProjectsFiltered("archived"),
        "archived"
      );
      const legacy = listUnifiedProjects("archived");
      return [
        ...hcArchived.map((project) => ({ kind: "hc" as const, project })),
        ...legacy,
      ];
    }
    const hcProjects = listHomeCheffProjectsFiltered("hc");
    const filtered = listHcProjectsByWorkflowStatus(hcProjects, filter as HcProjectWorkflowStatus | "active");
    return filtered.map((project) => ({ kind: "hc" as const, project }));
  }, [filter, refreshKey]);

  const hcItems = items.filter((item) => item.kind === "hc");

  const recentLocalEdits = useMemo(() => {
    void refreshKey;
    return listRecentLocalEdits();
  }, [refreshKey]);

  const hasSavedProjects = items.length > 0;
  const hasLocalEdits = recentLocalEdits.length > 0;

  const continueItem = useMemo(() => {
    void refreshKey;
    const active = listUnifiedProjects("active");
    return active[0] ?? null;
  }, [refreshKey]);

  const bump = () => {
    setLiveProjects({});
    setRefreshKey((k) => k + 1);
  };

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

  const toggleSelected = (projectId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    if (selectedIds.size > 1 && selectedIds.has(deleteTarget.projectId)) {
      bulkDeleteHcProjectRecords([...selectedIds]);
      setSelectedIds(new Set());
      setBulkMode(false);
    } else {
      permanentlyDeleteHcProjectRecord(deleteTarget.projectId);
    }
    setDeleteTarget(null);
    bump();
  };

  const handleBulkArchive = () => {
    bulkArchiveHcProjectRecords([...selectedIds]);
    setSelectedIds(new Set());
    setBulkMode(false);
    bump();
  };

  const handleBulkDelete = () => {
    const first = loadHomeCheffProject([...selectedIds][0] ?? "");
    if (!first) {
      return;
    }
    setDeleteTarget({
      projectId: first.id,
      projectTitle:
        selectedIds.size > 1
          ? t("hcProject.delete.multipleLabel" as never, { count: selectedIds.size } as never)
          : first.title,
      showExportedWarning: [...selectedIds].some((id) => {
        const project = loadHomeCheffProject(id);
        return project ? hcProjectHasExportedResults(project) : false;
      }),
    });
  };

  return (
    <StudioAuthGate authTitleKey="projects.authTitle" authBodyKey="projects.authBody">
      <main className={`${studioVisual.pageRoot} ${studioVisual.pageBg}`}>
        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <StudioPageIntro
            eyebrow={t("platform.hub.projectHub" as never)}
            title={t("projects.hub.title" as never)}
            description={t("suite.pageIntro.projects.description" as never)}
          />

          <div className="mt-6 max-w-xs">
            <ConversionSurface pageType="projects" variant="sidebar" source="projects_sidebar" />
          </div>

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
            {WORKFLOW_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={filter === f ? studioVisual.editorTabActive : studioVisual.editorTabInactive}
              >
                {t(`projects.hub.workflow.${f}` as never)}
              </button>
            ))}
            {LEGACY_FILTERS.map((f) => (
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className={`text-sm font-bold ${studioVisual.subheadingOnDark}`}>
              {t("projects.hub.section.projects" as never)}
            </h2>
            <div className="flex flex-wrap gap-2">
              <HcProjectImportButton
                className={studioVisual.btnOutline}
                onImported={() => bump()}
              />
              {hcItems.length > 0 ?
              <button
                type="button"
                className={studioVisual.btnOutline}
                onClick={() => {
                  setBulkMode((value) => !value);
                  setSelectedIds(new Set());
                }}
                data-testid="projects-hub-bulk-toggle"
              >
                {bulkMode ? t("hcProject.hub.bulk.cancel" as never) : t("hcProject.hub.bulk.select" as never)}
              </button>
              : null}
            </div>
          </div>

          {bulkMode && selectedIds.size > 0 ?
            <div className={`mt-3 flex flex-wrap gap-2 ${studioVisual.cardOnDarkMuted} p-3`} data-testid="projects-hub-bulk-actions">
              <button type="button" className={studioVisual.btnOutline} onClick={handleBulkArchive}>
                {t("hcProject.hub.bulk.archive" as never)}
              </button>
              <button type="button" className={studioVisual.btnOutline} onClick={handleBulkDelete}>
                {t("hcProject.hub.bulk.delete" as never)}
              </button>
            </div>
          : null}

          <ul className="mt-3 space-y-3">
            {!hasSavedProjects ?
              <li className={`p-8 text-center ${studioVisual.cardOnDarkMuted}`} data-testid="projects-hub-empty">
                <p className={`text-sm ${studioVisual.subheadingOnDark}`}>
                  {hasLocalEdits
                    ? t("projects.hub.emptyWithLocalEditsTitle" as never)
                    : t("projects.hub.emptyTitle" as never)}
                </p>
                <p className={`mt-2 text-sm ${studioVisual.bodyOnDark}`}>
                  {hasLocalEdits
                    ? t("projects.hub.emptyWithLocalEdits" as never)
                    : t("projects.hub.empty" as never)}
                </p>
                {hasLocalEdits ?
                  <a href="#recent-local-edits" className={`mt-4 inline-block ${studioVisual.btnGradientPrimary}`}>
                    {t("projects.hub.openRecentEdits" as never)}
                  </a>
                : null}
              </li>
            : items.map((item) => {
                if (item.kind === "hc") {
                  const project = liveProjects[item.project.id] ?? item.project;
                  return (
                    <HcProjectHubCard
                      key={project.id}
                      project={project}
                      bulkMode={bulkMode}
                      selected={selectedIds.has(project.id)}
                      onToggleSelected={() => toggleSelected(project.id)}
                      onOpen={(service) => void openHc(project.id, service)}
                      onRenamed={(next) => {
                        setLiveProjects((current) => ({ ...current, [next.id]: next }));
                      }}
                      onChanged={bump}
                      ownerId={auth.user?.id}
                      syncToServer={Boolean(auth.user)}
                      libraryStats={projectLibraryStats[project.id] ?? null}
                    />
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

          <div id="recent-local-edits">
            <RecentLocalEditsPanel onSavedAsProject={bump} />
          </div>

          <div className={`mt-10 ${studioVisual.cardOnDarkMuted} p-5`}>
            <h2 className={`mb-3 text-sm font-bold ${studioVisual.subheadingOnDark}`}>
              {t("projects.hub.section.generatedFiles" as never)}
            </h2>
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
      {deleteTarget ?
        <HcProjectDeleteDialog
          open
          projectTitle={deleteTarget.projectTitle}
          showExportedWarning={deleteTarget.showExportedWarning}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      : null}
    </StudioAuthGate>
  );
}
