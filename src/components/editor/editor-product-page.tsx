"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EditorCanvasWorkspace } from "@/components/editor/editor-canvas-workspace";
import { EditorStartScreen } from "@/components/editor/editor-start-screen";
import { loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { confirmLeaveEditorProject, editorProjectHasUnsavedVisualChanges } from "@/lib/editor-project-model";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function resolveEditorDocument(
  sessionId: string,
  override: EditorCanvasDocument | null
): EditorCanvasDocument | null {
  if (!sessionId) {
    return null;
  }
  if (override?.sessionId === sessionId) {
    return override;
  }
  return loadEditorCanvasDocument(sessionId);
}

export function EditorProductPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") ?? "";
  const [documentOverride, setDocumentOverride] = useState<EditorCanvasDocument | null>(null);
  const document = resolveEditorDocument(sessionId, documentOverride);

  const openDocument = (doc: EditorCanvasDocument) => {
    setDocumentOverride(doc);
    router.replace(`/editor?session=${encodeURIComponent(doc.sessionId)}`);
  };

  const handleBack = () => {
    if (document && editorProjectHasUnsavedVisualChanges(document)) {
      const ok = confirmLeaveEditorProject(t("editor.project.unsavedWarning" as never));
      if (!ok) {
        return;
      }
    }
    setDocumentOverride(null);
    router.replace("/editor");
  };

  if (sessionId && document) {
    return (
      <EditorCanvasWorkspace
        document={document}
        onBack={handleBack}
        onDocumentChange={setDocumentOverride}
      />
    );
  }

  if (sessionId && !document) {
    return <EditorStartScreen onOpenDocument={openDocument} />;
  }

  return <EditorStartScreen onOpenDocument={openDocument} />;
}
