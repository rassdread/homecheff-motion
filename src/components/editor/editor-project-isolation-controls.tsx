"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { clearAllEditorProjectIsolationState } from "@/lib/editor-project-isolation";
import { startEditorImageAnalysis } from "@/lib/start-editor-image-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  /** Called before navigating away for a fresh project. */
  onNewProject?: () => void;
  compact?: boolean;
  className?: string;
};

export function EditorProjectIsolationControls({
  document,
  onDocumentChange,
  onNewProject,
  compact = false,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleNewProject = () => {
    clearAllEditorProjectIsolationState(document.sessionId, document.instructionStudioState?.hcProjectId);
    if (onNewProject) {
      onNewProject();
      return;
    }
    router.push("/editor/start");
  };

  const handleReanalyze = async () => {
    setBusy(true);
    try {
      clearAllEditorProjectIsolationState(
        document.sessionId,
        document.instructionStudioState?.hcProjectId
      );
      await startEditorImageAnalysis({
        document,
        trigger: "isolation-controls",
        force: true,
        preserveUserEdits: false,
        onDocumentChange,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={handleNewProject}
        className={`rounded-full border border-zinc-200 bg-white font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60 ${
          compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
        }`}
        title={t("editor.isolation.newProjectHint" as never)}
      >
        {t("editor.isolation.newProject" as never)}
      </button>
      <button
        type="button"
        disabled={busy || !document.backgroundUrl?.trim()}
        onClick={() => void handleReanalyze()}
        className={`rounded-full border border-violet-200 bg-violet-50 font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60 ${
          compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
        }`}
        title={t("editor.isolation.reanalyzeHint" as never)}
      >
        {busy ? t("button.loading" as never) : t("editor.isolation.reanalyze" as never)}
      </button>
    </div>
  );
}
