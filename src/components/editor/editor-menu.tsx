"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { WorkflowStageView } from "@/lib/editor-workflow-orchestration";
import type { EditorImagePhase, EditorWorkspaceIntent } from "@/types/editor-instruction-studio";
import { EDITOR_IMAGE_PHASES } from "@/types/editor-instruction-studio";

type Props = {
  projectName: string;
  saving?: boolean;
  activeTab: EditorWorkspaceIntent | "projects";
  activeImagePhase?: EditorImagePhase;
  stages: WorkflowStageView[];
  motionUnlocked?: boolean;
  isAdmin?: boolean;
  showAdvancedToggle?: boolean;
  advancedMode?: boolean;
  onSaveProject: () => void;
  onRenameProject: () => void;
  onSaveAsNewProject: () => void;
  onReview: () => void;
  onDownload: () => void;
  onOpenInProjects: () => void;
  onArchiveProject?: () => void;
  onRestoreProject?: () => void;
  onDeleteProject?: () => void;
  onDownloadProject?: () => void;
  onImportProject?: () => void;
  isProjectArchived?: boolean;
  onClose: () => void;
  onTabChange: (tab: EditorWorkspaceIntent | "projects") => void;
  onPhaseChange?: (phase: EditorImagePhase) => void;
  onToggleAdvanced?: () => void;
  onToggleAiAnalysis?: () => void;
  showAiAnalysis?: boolean;
};

export function EditorMenu({
  projectName,
  saving = false,
  activeTab,
  activeImagePhase,
  stages,
  motionUnlocked = false,
  isAdmin = false,
  showAdvancedToggle = false,
  advancedMode = false,
  onSaveProject,
  onRenameProject,
  onSaveAsNewProject,
  onReview,
  onDownload,
  onOpenInProjects,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onDownloadProject,
  onImportProject,
  isProjectArchived = false,
  onClose,
  onTabChange,
  onPhaseChange,
  onToggleAdvanced,
  onToggleAiAnalysis,
  showAiAnalysis = false,
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

  const currentStage = stages.find((s) => s.status === "current") ?? stages[0];

  return (
    <div ref={rootRef} className="relative" data-testid="editor-menu">
      <button
        type="button"
        aria-expanded={open}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300/90 bg-white/95 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:border-[#0067B1]/30`}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden>⚙</span>
        {t("editor.menu.title" as never)}
      </button>
      {open ?
        <div
          className={`absolute right-0 z-40 mt-2 w-72 border border-zinc-200/90 p-2 shadow-xl ${studioVisual.editorSurface}`}
        >
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.menu.projectName" as never)}
          </p>
          <p className="truncate px-3 text-sm font-semibold text-zinc-900">{projectName}</p>
          {item("rename", t("editor.menu.renameProject" as never), onRenameProject)}
          <div className="my-1 border-t border-zinc-200/80" />
          {item("save-project", t("editor.menu.saveProject" as never), onSaveProject, saving)}
          {item("save-as-new", t("editor.menu.saveAsNewProject" as never), onSaveAsNewProject, saving)}
          {item("review", t("editor.menu.review" as never), onReview)}
          {item("download", t("editor.menu.downloadPreview" as never), onDownload)}
          {item("open-projects", t("editor.menu.openInProjects" as never), onOpenInProjects)}
          <div className="my-1 border-t border-zinc-200/80" />
          {isProjectArchived && onRestoreProject
            ? item("restore", t("hcProject.menu.restoreProject" as never), onRestoreProject)
            : onArchiveProject
              ? item("archive", t("hcProject.menu.archiveProject" as never), onArchiveProject)
              : null}
          {onDeleteProject ? item("delete", t("hcProject.menu.deleteProject" as never), onDeleteProject) : null}
          {onDownloadProject
            ? item("download", t("hcProject.menu.downloadProject" as never), onDownloadProject)
            : null}
          {onImportProject ? item("import", t("hcProject.menu.importProject" as never), onImportProject) : null}
          {item("close", t("editor.menu.close" as never), onClose)}
          <div className="my-1 border-t border-zinc-200/80" />
          <p className="px-3 py-1 text-[11px] font-medium text-zinc-500">
            {t("editor.menu.workflowStatus" as never)}:{" "}
            {currentStage ? t(currentStage.labelKey as never) : "—"}
          </p>
          <div className="my-1 border-t border-zinc-200/80" />
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.workflow.phase.sectionEditor" as never)}
          </p>
          {EDITOR_IMAGE_PHASES.map((phase) =>
            item(
              `phase-${phase}`,
              `${t(`editor.workflow.phase.${phase}` as never)}${activeImagePhase === phase ? " ✓" : ""}`,
              () => {
                onTabChange("edit");
                onPhaseChange?.(phase);
              }
            )
          )}
          <div className="my-1 border-t border-zinc-200/80" />
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.workflow.phase.sectionMotion" as never)}
          </p>
          {item(
            "tab-motion",
            t("editor.workflow.tab.motion" as never),
            () => onTabChange("motion"),
            !motionUnlocked
          )}
          {item("tab-combine", t("editor.workflow.tab.combine" as never), () => onTabChange("combine"))}
          {item("tab-export", t("editor.workflow.tab.export" as never), () => onTabChange("export"))}
          {showAdvancedToggle && onToggleAdvanced
            ? item(
                "toggle-advanced",
                advancedMode
                  ? t("editor.human.backToVisual" as never)
                  : t("editor.menu.advancedControls" as never),
                onToggleAdvanced
              )
            : null}
          {isAdmin && onToggleAiAnalysis
            ? item(
                "toggle-ai-analysis",
                showAiAnalysis
                  ? t("editor.ux.aiAnalysis.hide" as never)
                  : t("editor.menu.aiAnalysis" as never),
                onToggleAiAnalysis
              )
            : null}
        </div>
      : null}
    </div>
  );
}
