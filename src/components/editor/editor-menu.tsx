"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { WorkflowStageView } from "@/lib/editor-workflow-orchestration";
import type { EditorWorkspaceIntent } from "@/types/editor-instruction-studio";

type Props = {
  documentName: string;
  saving?: boolean;
  activeTab: EditorWorkspaceIntent | "projects";
  stages: WorkflowStageView[];
  isAdmin?: boolean;
  showAdvancedToggle?: boolean;
  advancedMode?: boolean;
  onSave: () => void;
  onReview: () => void;
  onDownload: () => void;
  onProjects: () => void;
  onClose: () => void;
  onTabChange: (tab: EditorWorkspaceIntent | "projects") => void;
  onToggleAdvanced?: () => void;
  onToggleAiAnalysis?: () => void;
  showAiAnalysis?: boolean;
};

export function EditorMenu({
  documentName,
  saving = false,
  activeTab,
  stages,
  isAdmin = false,
  showAdvancedToggle = false,
  advancedMode = false,
  onSave,
  onReview,
  onDownload,
  onProjects,
  onClose,
  onTabChange,
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

  const item = (label: string, action: () => void, disabled?: boolean) => (
    <button
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
            {documentName}
          </p>
          <div className="my-1 border-t border-zinc-200/80" />
          {item(t("editor.menu.save" as never), onSave, saving)}
          {item(t("editor.menu.saveDraft" as never), onSave, saving)}
          {item(t("editor.menu.review" as never), onReview)}
          {item(t("editor.menu.downloadPreview" as never), onDownload)}
          {item(t("editor.menu.projects" as never), onProjects)}
          {item(t("editor.menu.close" as never), onClose)}
          <div className="my-1 border-t border-zinc-200/80" />
          <p className="px-3 py-1 text-[11px] font-medium text-zinc-500">
            {t("editor.menu.workflowStatus" as never)}:{" "}
            {currentStage ? t(currentStage.labelKey as never) : "—"}
          </p>
          <div className="my-1 border-t border-zinc-200/80" />
          {item(t("editor.workflow.tab.edit" as never), () => onTabChange("edit"))}
          {item(t("editor.workflow.tab.combine" as never), () => onTabChange("combine"))}
          {item(t("editor.workflow.tab.motion" as never), () => onTabChange("motion"))}
          {item(t("editor.workflow.tab.export" as never), () => onTabChange("export"))}
          {showAdvancedToggle && onToggleAdvanced
            ? item(
                advancedMode
                  ? t("editor.human.backToVisual" as never)
                  : t("editor.menu.advancedControls" as never),
                onToggleAdvanced
              )
            : null}
          {isAdmin && onToggleAiAnalysis
            ? item(
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
