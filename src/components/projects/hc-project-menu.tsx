"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  projectName: string;
  saving?: boolean;
  isArchived?: boolean;
  onSaveProject: () => void;
  onRenameProject: () => void;
  onSaveAsNewProject: () => void;
  onOpenInProjects: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onDownloadProject?: () => void;
  onImportProject?: () => void;
  onClose: () => void;
};

export function HcProjectMenu({
  projectName,
  saving = false,
  isArchived = false,
  onSaveProject,
  onRenameProject,
  onSaveAsNewProject,
  onOpenInProjects,
  onArchive,
  onRestore,
  onDelete,
  onDownloadProject,
  onImportProject,
  onClose,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const item = (key: string, label: string, action: () => void, disabled?: boolean) => (
    <button
      key={key}
      type="button"
      disabled={disabled}
      className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-40"
      onClick={() => {
        action();
        setOpen(false);
      }}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} className="relative" data-testid="hc-project-menu">
      <button
        type="button"
        aria-expanded={open}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300/90 bg-white/95 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:border-[#0067B1]/30`}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden>⚙</span>
        {t("hcProject.menu.title" as never)}
      </button>
      {open ?
        <div
          className={`absolute right-0 z-40 mt-2 w-72 border border-zinc-200/90 p-2 shadow-xl ${studioVisual.editorSurface}`}
        >
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("hcProject.menu.projectName" as never)}
          </p>
          <p className="truncate px-3 text-sm font-semibold text-zinc-900">{projectName}</p>
          {item("rename", t("hcProject.menu.renameProject" as never), onRenameProject)}
          <div className="my-1 border-t border-zinc-200/80" />
          {item("save-project", t("hcProject.menu.saveProject" as never), onSaveProject, saving)}
          {item("save-as-new", t("hcProject.menu.saveAsNewProject" as never), onSaveAsNewProject, saving)}
          {item("open-projects", t("hcProject.menu.openInProjects" as never), onOpenInProjects)}
          <div className="my-1 border-t border-zinc-200/80" />
          {isArchived && onRestore
            ? item("restore", t("hcProject.menu.restoreProject" as never), onRestore)
            : onArchive
              ? item("archive", t("hcProject.menu.archiveProject" as never), onArchive)
              : null}
          {onDelete ? item("delete", t("hcProject.menu.deleteProject" as never), onDelete) : null}
          {onDownloadProject
            ? item("download", t("hcProject.menu.downloadProject" as never), onDownloadProject)
            : null}
          {onImportProject ? item("import", t("hcProject.menu.importProject" as never), onImportProject) : null}
          {item("close", t("hcProject.menu.closeProject" as never), onClose)}
        </div>
      : null}
    </div>
  );
}
