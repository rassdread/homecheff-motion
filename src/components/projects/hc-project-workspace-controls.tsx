"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditorProjectNameDialog } from "@/components/editor/editor-project-name-dialog";
import { HcProjectDeleteDialog } from "@/components/projects/hc-project-delete-dialog";
import { HcProjectImportDialog } from "@/components/projects/hc-project-import-dialog";
import { HcProjectMenu } from "@/components/projects/hc-project-menu";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { useHcProjectImportFlow } from "@/hooks/use-hc-project-import-flow";
import { useHcProjectTitleSync } from "@/hooks/use-hc-project-title-sync";
import { useActiveTranslator } from "@/i18n/client";
import {
  archiveHcProjectRecord,
  hcProjectHasExportedResults,
  permanentlyDeleteHcProjectRecord,
  restoreHcProjectRecord,
} from "@/lib/hc-project-delete-archive";
import {
  defaultHcProjectTitleFallback,
  readHcProjectWorkflowStatus,
  resolveHcProjectSaveMessageKey,
  saveHcProjectAsNewCopy,
  saveHcProjectPackage,
  type HcProjectSourceModule,
} from "@/lib/hc-project-lifecycle";
import { exportHcProjectRecord } from "@/lib/hc-project-file-io";
import { renameHcProjectEverywhere } from "@/lib/hc-project-title-sync";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  project: HomeCheffProjectPackage | null;
  onProjectChange: (project: HomeCheffProjectPackage) => void;
  sourceModule: HcProjectSourceModule;
  ownerId?: string;
  syncToServer?: boolean;
  closeHref?: string;
};

export function HcProjectWorkspaceControls({
  project,
  onProjectChange,
  sourceModule,
  ownerId,
  syncToServer,
  closeHref = "/projects",
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusKey, setStatusKey] = useState<string | null>(null);
  const { ui: importUi, actions: importActions, fileInputRef } = useHcProjectImportFlow({
    targetService: sourceModule,
    onImported: (imported) => onProjectChange(imported),
  });

  useHcProjectTitleSync(project?.id, (next) => onProjectChange(next));

  if (!project) {
    return null;
  }

  const projectTitle =
    project.title?.trim() || defaultHcProjectTitleFallback(sourceModule);
  const isArchived = project.isArchived || readHcProjectWorkflowStatus(project) === "archived";

  const notify = (next: HomeCheffProjectPackage, created = false, renamed = false) => {
    onProjectChange(next);
    setStatusKey(
      resolveHcProjectSaveMessageKey({
        workflowStatus: readHcProjectWorkflowStatus(next),
        created,
        renamed,
      })
    );
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 bg-sky-50/50 px-4 py-2"
      data-testid="hc-project-workspace-controls"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <HcProjectStateBadge project={project} compact />
        <p className="truncate text-sm font-semibold text-zinc-900">{projectTitle}</p>
      </div>
      <HcProjectMenu
        projectName={projectTitle}
        saving={saving}
        onSaveProject={() => {
          setSaving(true);
          notify(saveHcProjectPackage({ project, syncToServer }), false);
          setSaving(false);
        }}
        onRenameProject={() => setRenameOpen(true)}
        onSaveAsNewProject={() => {
          setSaving(true);
          const copy = saveHcProjectAsNewCopy({ project, ownerId, syncToServer });
          notify(copy, true);
          setSaving(false);
        }}
        onOpenInProjects={() =>
          router.push(`/projects?highlight=${encodeURIComponent(project.id)}`)
        }
        isArchived={isArchived}
        onArchive={() => {
          const archived = archiveHcProjectRecord(project.id, { syncToServer });
          if (archived) {
            notify(archived);
            setStatusKey("hcProject.archive.archived");
          }
        }}
        onRestore={() => {
          const restored = restoreHcProjectRecord(project.id, { syncToServer });
          if (restored) {
            notify(restored);
            setStatusKey("hcProject.archive.restored");
          }
        }}
        onDelete={() => setDeleteOpen(true)}
        onDownloadProject={() => {
          exportHcProjectRecord(project);
          setStatusKey("hcProject.file.exportStarted");
        }}
        onImportProject={importActions.openImportPicker}
        onClose={() => router.push(closeHref)}
      />
      {statusKey ?
        <p className="w-full text-xs text-emerald-800" role="status">
          {t(statusKey as never, { name: projectTitle } as never)}
        </p>
      : null}
      <EditorProjectNameDialog
        open={renameOpen}
        initialName={projectTitle}
        onCancel={() => setRenameOpen(false)}
        onConfirm={(title) => {
          const next = renameHcProjectEverywhere({ project, title, ownerId, syncToServer });
          if (next) {
            notify(next, false, true);
          }
          setRenameOpen(false);
        }}
      />
      <HcProjectDeleteDialog
        open={deleteOpen}
        projectTitle={projectTitle}
        showExportedWarning={hcProjectHasExportedResults(project)}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          permanentlyDeleteHcProjectRecord(project.id);
          setDeleteOpen(false);
          router.push(closeHref);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".hc,application/json,application/vnd.homecheff.project+json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importActions.handleFile(file);
          }
        }}
      />
      <HcProjectImportDialog
        open={importUi.dialogOpen}
        preview={importUi.preview}
        errorKey={importUi.errorKey}
        busy={importUi.busy}
        onCancel={importActions.cancelImport}
        onConfirm={() => void importActions.confirmImport()}
      />
    </div>
  );
}
