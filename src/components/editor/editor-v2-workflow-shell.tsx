"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EditorCombineWorkspace } from "@/components/editor/editor-combine-workspace";
import { EditorExportWorkspace } from "@/components/editor/editor-export-workspace";
import { EditorInstructionStudioWorkspace } from "@/components/editor/editor-instruction-studio-workspace";
import { EditorMotionWorkspace } from "@/components/editor/editor-motion-workspace";
import { EditorProjectTopBar } from "@/components/editor/editor-project-top-bar";
import { EditorSmartNextSteps } from "@/components/editor/editor-smart-next-steps";
import { EditorWorkflowStatusBar } from "@/components/editor/editor-workflow-status-bar";
import { useActiveTranslator } from "@/i18n/client";
import { editorHandoffStudioUrl } from "@/lib/editor-instruction-handoff";
import {
  detectEditorWorkflowIntent,
  patchWorkflowIntent,
  resolveWorkflowIntent,
  resolveWorkflowStages,
  suggestSmartNextSteps,
} from "@/lib/editor-workflow-orchestration";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorWorkspaceIntent } from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  isAdmin?: boolean;
  saving?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSave: () => void;
  onClose: () => void;
  onProjects: () => void;
};

const WORKSPACE_TABS: Array<{ id: EditorWorkspaceIntent | "projects"; labelKey: string }> = [
  { id: "edit", labelKey: "editor.workflow.tab.edit" },
  { id: "combine", labelKey: "editor.workflow.tab.combine" },
  { id: "motion", labelKey: "editor.workflow.tab.motion" },
  { id: "export", labelKey: "editor.workflow.tab.export" },
  { id: "projects", labelKey: "editor.workflow.tab.projects" },
];

export function EditorV2WorkflowShell({
  document,
  busy = false,
  isAdmin = false,
  saving = false,
  onDocumentChange,
  onSave,
  onClose,
  onProjects,
}: Props) {
  const t = useActiveTranslator();
  const [activeTab, setActiveTab] = useState<EditorWorkspaceIntent | "projects">(
    resolveWorkflowIntent(document)
  );

  const stages = useMemo(() => resolveWorkflowStages(document), [document]);
  const nextSteps = useMemo(() => suggestSmartNextSteps(document), [document]);

  const setIntent = (intent: EditorWorkspaceIntent) => {
    setActiveTab(intent);
    onDocumentChange(patchWorkflowIntent(document, intent));
  };

  const handleNextStep = (step: ReturnType<typeof suggestSmartNextSteps>[number]) => {
    if (step.intent) {
      setIntent(step.intent);
      return;
    }
    if (step.id === "studio") {
      window.location.href = editorHandoffStudioUrl(document);
      return;
    }
    if (step.id === "generate" && activeTab === "edit") {
      return;
    }
    if (step.id === "approve") {
      setIntent("edit");
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <EditorProjectTopBar
        document={document}
        saving={saving}
        onSave={onSave}
        onClose={onClose}
        onProjects={onProjects}
      />

      <EditorWorkflowStatusBar stages={stages} />

      <div className="flex flex-wrap gap-2">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === "projects") {
                onProjects();
                return;
              }
              setIntent(tab.id);
            }}
            className={
              activeTab === tab.id ? studioVisual.editorTabActive : studioVisual.editorTabInactive
            }
          >
            {t(tab.labelKey as never)}
          </button>
        ))}
      </div>

      <EditorSmartNextSteps steps={nextSteps} onStep={handleNextStep} />

      {activeTab === "edit" ?
        <EditorInstructionStudioWorkspace
          document={document}
          busy={busy}
          isAdmin={isAdmin}
          onDocumentChange={(next) =>
            onDocumentChange(
              patchWorkflowIntent(next, detectEditorWorkflowIntent(next))
            )
          }
          onSave={onSave}
        />
      : null}

      {activeTab === "combine" ?
        <EditorCombineWorkspace
          document={document}
          busy={busy}
          onDocumentChange={onDocumentChange}
          onSave={onSave}
        />
      : null}

      {activeTab === "motion" ?
        <EditorMotionWorkspace document={document} />
      : null}

      {activeTab === "export" ?
        <EditorExportWorkspace document={document} onDocumentChange={onDocumentChange} />
      : null}

      {activeTab === "projects" ?
        <div className={`${studioVisual.editorSurface} p-6 text-center`}>
          <p className="text-sm text-zinc-600">{t("editor.workflow.projects.lead" as never)}</p>
          <Link href="/editor" className={`mt-3 inline-block ${studioVisual.btnGradientPrimary} px-4 py-2 text-xs`}>
            {t("editor.workflow.projects.open" as never)}
          </Link>
        </div>
      : null}
    </div>
  );
}
