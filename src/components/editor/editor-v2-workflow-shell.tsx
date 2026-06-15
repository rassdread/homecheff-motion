"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EditorCombineWorkspace } from "@/components/editor/editor-combine-workspace";
import { EditorExportWorkspace } from "@/components/editor/editor-export-workspace";
import { EditorImagePhaseNav } from "@/components/editor/editor-image-phase-nav";
import { EditorInstructionAiDirectorBar } from "@/components/editor/editor-instruction-ai-director-bar";
import { EditorInstructionStudioWorkspace } from "@/components/editor/editor-instruction-studio-workspace";
import { EditorMenu } from "@/components/editor/editor-menu";
import { EditorMotionPhaseNav } from "@/components/editor/editor-motion-phase-nav";
import { EditorMotionWorkspace } from "@/components/editor/editor-motion-workspace";
import { useActiveTranslator } from "@/i18n/client";
import { defaultSelectionForObject } from "@/lib/editor-instruction-object-v2";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { editorHandoffStudioUrl } from "@/lib/editor-instruction-handoff";
import {
  detectEditorWorkflowIntent,
  patchWorkflowIntent,
  resolveWorkflowIntent,
  resolveWorkflowStages,
  suggestSmartNextSteps,
} from "@/lib/editor-workflow-orchestration";
import {
  isMotionWorkspaceUnlocked,
  patchEditorImagePhase,
  resolveEditorImagePhase,
} from "@/lib/editor-workflow-phases";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorImagePhase, EditorWorkspaceIntent } from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  isAdmin?: boolean;
  saving?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSaveProject: () => void;
  onRenameProject: () => void;
  onSaveAsNewProject: () => void;
  onClose: () => void;
  onOpenInProjects: () => void;
  onArchiveProject?: () => void;
  onRestoreProject?: () => void;
  onDeleteProject?: () => void;
  onDownloadProject?: () => void;
  onImportProject?: () => void;
  isProjectArchived?: boolean;
  onReview: () => void;
  onDownload: () => void;
  onToggleAdvanced?: () => void;
  advancedMode?: boolean;
  onToggleAiAnalysis?: () => void;
  showAiAnalysis?: boolean;
};

export function EditorV2WorkflowShell({
  document,
  busy = false,
  isAdmin = false,
  saving = false,
  onDocumentChange,
  onSaveProject,
  onRenameProject,
  onSaveAsNewProject,
  onClose,
  onOpenInProjects,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onDownloadProject,
  onImportProject,
  isProjectArchived = false,
  onReview,
  onDownload,
  onToggleAdvanced,
  advancedMode = false,
  onToggleAiAnalysis,
  showAiAnalysis = false,
}: Props) {
  const t = useActiveTranslator();
  const [activeTab, setActiveTab] = useState<EditorWorkspaceIntent | "projects">(
    resolveWorkflowIntent(document)
  );

  const stages = useMemo(() => resolveWorkflowStages(document), [document]);
  const nextSteps = useMemo(() => suggestSmartNextSteps(document), [document]);
  const editableObjects = useMemo(() => listInstructionObjectsV2(document), [document]);
  const motionUnlocked = useMemo(() => isMotionWorkspaceUnlocked(document), [document]);
  const activeImagePhase = useMemo(() => resolveEditorImagePhase(document), [document]);

  const setIntent = (intent: EditorWorkspaceIntent | "projects") => {
    if (intent === "projects") {
      onOpenInProjects();
      return;
    }
    if (intent === "motion" && !motionUnlocked) {
      setActiveTab("edit");
      onDocumentChange(
        patchEditorImagePhase(patchWorkflowIntent(document, "edit"), "approve")
      );
      return;
    }
    setActiveTab(intent);
    onDocumentChange(patchWorkflowIntent(document, intent));
  };

  const setImagePhase = (phase: EditorImagePhase) => {
    setActiveTab("edit");
    onDocumentChange(patchEditorImagePhase(patchWorkflowIntent(document, "edit"), phase));
  };

  const handleDirectorApply = (objectLabel: string, category: string) => {
    const obj = editableObjects.find(
      (o) =>
        o.label.toLowerCase().includes(objectLabel.toLowerCase()) ||
        o.category === category
    );
    if (obj) {
      onDocumentChange({
        ...document,
        instructionStudioState: {
          ...document.instructionStudioState,
          selection: defaultSelectionForObject(obj),
        },
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleNextStep = (step: ReturnType<typeof suggestSmartNextSteps>[number]) => {
    if (step.id === "approve") {
      setImagePhase("approve");
      return;
    }
    if (step.id === "generate" || step.id === "variants") {
      setImagePhase("variants");
      return;
    }
    if (step.id === "analyze") {
      setImagePhase("analyze");
      return;
    }
    if (step.id === "add_change") {
      setImagePhase("edit");
      return;
    }
    if (step.intent) {
      setIntent(step.intent);
      return;
    }
    if (step.id === "studio") {
      window.location.href = editorHandoffStudioUrl(document);
    }
  };

  const primaryNext = nextSteps[0];

  return (
    <div className="space-y-4" data-testid="editor-v2-workflow-shell">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {activeTab === "edit" ?
            <EditorInstructionAiDirectorBar
              document={document}
              editableObjects={editableObjects}
              isAdmin={isAdmin}
              onDocumentChange={onDocumentChange}
              onApplyFirstChange={handleDirectorApply}
            />
          : (
            <section className={`p-4 ${studioVisual.editorSurface}`}>
              <h2 className="text-sm font-semibold text-zinc-900">
                {t(`editor.workflow.tab.${activeTab}` as never)}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {t("editor.workflow.tabLead" as never)}
              </p>
            </section>
          )}
        </div>
        <EditorMenu
          projectName={document.name}
          saving={saving}
          activeTab={activeTab}
          activeImagePhase={activeImagePhase}
          stages={stages}
          motionUnlocked={motionUnlocked}
          isAdmin={isAdmin}
          showAdvancedToggle={Boolean(onToggleAdvanced)}
          advancedMode={advancedMode}
          onSaveProject={onSaveProject}
          onRenameProject={onRenameProject}
          onSaveAsNewProject={onSaveAsNewProject}
          onReview={onReview}
          onDownload={onDownload}
          onOpenInProjects={onOpenInProjects}
          onArchiveProject={onArchiveProject}
          onRestoreProject={onRestoreProject}
          onDeleteProject={onDeleteProject}
          onDownloadProject={onDownloadProject}
          onImportProject={onImportProject}
          isProjectArchived={isProjectArchived}
          onClose={onClose}
          onTabChange={setIntent}
          onPhaseChange={setImagePhase}
          onToggleAdvanced={onToggleAdvanced}
          onToggleAiAnalysis={onToggleAiAnalysis}
          showAiAnalysis={showAiAnalysis}
        />
      </div>

      {primaryNext && activeTab === "edit" ?
        <div className={`flex flex-wrap items-center gap-2 px-3 py-2 text-xs ${studioVisual.editorSurface}`}>
          <span className="font-medium text-zinc-600">
            {t("editor.workflow.next.title" as never)}:
          </span>
          <button
            type="button"
            className="rounded-full border border-[#0067B1]/25 bg-[#0067B1]/5 px-3 py-1 font-semibold text-[#0067B1]"
            onClick={() => handleNextStep(primaryNext)}
          >
            {t(primaryNext.labelKey as never)}
          </button>
        </div>
      : null}

      {activeTab === "edit" ?
        <>
          <p className="text-sm text-white/80" data-testid="editor-workflow-principle">
            {t("editor.workflow.principle" as never)}
          </p>
          <EditorImagePhaseNav activePhase={activeImagePhase} onPhaseChange={setImagePhase} />
          <EditorMotionPhaseNav
            unlocked={motionUnlocked}
            onOpenMotionReview={() => setIntent("motion")}
          />
        </>
      : null}

      {activeTab === "edit" ?
        <EditorInstructionStudioWorkspace
          document={document}
          busy={busy}
          isAdmin={isAdmin}
          activePhase={activeImagePhase}
          motionUnlocked={motionUnlocked}
          onPhaseChange={setImagePhase}
          onDocumentChange={(next) =>
            onDocumentChange(patchWorkflowIntent(next, detectEditorWorkflowIntent(next)))
          }
          onSave={onSaveProject}
        />
      : null}

      {activeTab === "combine" ?
        <EditorCombineWorkspace
          document={document}
          busy={busy}
          onDocumentChange={onDocumentChange}
          onSave={onSaveProject}
        />
      : null}

      {activeTab === "motion" ?
        <EditorMotionWorkspace document={document} motionUnlocked={motionUnlocked} />
      : null}

      {activeTab === "export" ?
        <EditorExportWorkspace document={document} onDocumentChange={onDocumentChange} />
      : null}

      {activeTab === "projects" ?
        <div className={`${studioVisual.editorSurface} p-6 text-center`}>
          <p className="text-sm text-zinc-600">{t("editor.workflow.projects.lead" as never)}</p>
          <Link
            href="/projects"
            className="mt-3 inline-flex rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("editor.menu.openInProjects" as never)}
          </Link>
        </div>
      : null}
    </div>
  );
}
