"use client";

import { useState } from "react";
import { HcProjectCardBadges } from "@/components/projects/hc-project-card-badges";
import { HcProjectDeleteDialog } from "@/components/projects/hc-project-delete-dialog";
import { HcProjectHubCardMenu } from "@/components/projects/hc-project-hub-card-menu";
import { HcProjectInlineTitle } from "@/components/projects/hc-project-inline-title";
import { HcProjectSummaryCard } from "@/components/projects/hc-project-summary-card";
import { useActiveTranslator } from "@/i18n/client";
import {
  formatHcProjectRelativeUpdatedAt,
  shouldShowDefaultTitleReminder,
} from "@/lib/hc-project-card-utils";
import {
  archiveHcProjectRecord,
  hcProjectHasExportedResults,
  permanentlyDeleteHcProjectRecord,
  restoreHcProjectRecord,
} from "@/lib/hc-project-delete-archive";
import { exportHcProjectRecord } from "@/lib/hc-project-file-io";
import { readHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import { resolveHcProjectOpenTargets } from "@/lib/homecheff-project-package-core";
import { duplicateHcProject } from "@/lib/homecheff-project-persist";
import { renameHcProjectEverywhere } from "@/lib/hc-project-title-sync";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { LibraryProjectAssetStats } from "@/lib/library-asset-index";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

const SERVICE_OPEN_LABEL: Record<string, string> = {
  editor: "hcProject.openEditor",
  motion: "hcProject.openMotion",
  publish: "hcProject.openPublish",
  studio: "hcProject.openStudio",
};

type Props = {
  project: HomeCheffProjectPackage;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  onOpen: (service?: HomeCheffProjectType) => void;
  onRenamed: (project: HomeCheffProjectPackage) => void;
  onChanged: () => void;
  ownerId?: string;
  syncToServer?: boolean;
  libraryStats?: LibraryProjectAssetStats | null;
};

export function HcProjectHubCard({
  project,
  bulkMode = false,
  selected = false,
  onToggleSelected,
  onOpen,
  onRenamed,
  onChanged,
  ownerId,
  syncToServer,
  libraryStats,
}: Props) {
  const t = useActiveTranslator();
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isArchived = project.isArchived || readHcProjectWorkflowStatus(project) === "archived";
  const targets = resolveHcProjectOpenTargets(project);
  const showTitleReminder = shouldShowDefaultTitleReminder(project);
  const relativeKey = formatHcProjectRelativeUpdatedAt(project.updatedAt);

  const handleRename = (title: string) => {
    const next = renameHcProjectEverywhere({
      project,
      title,
      ownerId,
      syncToServer,
    });
    if (next) {
      onRenamed(next);
      onChanged();
    }
  };

  return (
    <li className={studioVisual.hubCard} data-testid={`hc-project-card-${project.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {bulkMode ?
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={selected}
              onChange={onToggleSelected}
              aria-label={project.title}
            />
          : null}
          <div className="min-w-0 flex-1 space-y-2">
            <HcProjectInlineTitle
              title={project.title}
              editing={renaming}
              onEditingChange={setRenaming}
              onSave={handleRename}
            />
            <HcProjectCardBadges project={project} />
            <p className="text-xs text-zinc-500" data-testid="hc-project-card-updated">
              {t("hcProject.card.lastUpdated" as never)}{" "}
              {relativeKey === "just_now"
                ? t("hcProject.card.updatedJustNow" as never)
                : relativeKey.startsWith("minutes_")
                  ? t("hcProject.card.updatedMinutes" as never, {
                      count: Number(relativeKey.replace("minutes_", "")),
                    } as never)
                  : relativeKey.startsWith("hours_")
                    ? t("hcProject.card.updatedHours" as never, {
                        count: Number(relativeKey.replace("hours_", "")),
                      } as never)
                    : relativeKey.startsWith("days_")
                      ? t("hcProject.card.updatedDays" as never, {
                          count: Number(relativeKey.replace("days_", "")),
                        } as never)
                      : new Date(project.updatedAt).toLocaleString()}
            </p>
            {showTitleReminder ?
              <div
                className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                data-testid="hc-project-default-title-reminder"
              >
                <span>{t("hcProject.card.defaultTitleReminder" as never)}</span>
                <button
                  type="button"
                  className="font-semibold text-[#0067B1] underline"
                  onClick={() => setRenaming(true)}
                >
                  {t("hcProject.card.renameAction" as never)}
                </button>
              </div>
            : null}
          </div>
        </div>
        <HcProjectHubCardMenu
          isArchived={isArchived}
          onRename={() => setRenaming(true)}
          onDownload={() => exportHcProjectRecord(project)}
          onDuplicate={() => {
            duplicateHcProject(project.id);
            onChanged();
          }}
          onArchive={() => {
            archiveHcProjectRecord(project.id, { syncToServer });
            onChanged();
          }}
          onRestore={() => {
            restoreHcProjectRecord(project.id, { syncToServer });
            onChanged();
          }}
          onDelete={() => setDeleteOpen(true)}
        />
      </div>
      <HcProjectSummaryCard project={project} libraryStats={libraryStats} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={studioVisual.btnGradientPrimary}
          data-testid="hc-project-card-open"
          onClick={() => onOpen()}
        >
          {t("hcProject.hub.menu.open" as never)}
        </button>
        {targets.map((svc) => (
          <button
            key={svc}
            type="button"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:border-[#0067B1]"
            onClick={() => onOpen(svc)}
          >
            {t((SERVICE_OPEN_LABEL[svc] ?? "hcProject.open") as never)}
          </button>
        ))}
      </div>
      <HcProjectDeleteDialog
        open={deleteOpen}
        projectTitle={project.title}
        showExportedWarning={hcProjectHasExportedResults(project)}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          permanentlyDeleteHcProjectRecord(project.id);
          setDeleteOpen(false);
          onChanged();
        }}
      />
    </li>
  );
}
