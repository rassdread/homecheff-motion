"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EditorCanvasWorkspace } from "@/components/editor/editor-canvas-workspace";
import { EditorStartScreen } from "@/components/editor/editor-start-screen";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchEditorProject } from "@/lib/editor-project-client";
import { loadEditorCanvasDocument, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
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
  const auth = useAuthSession();
  const sessionId = searchParams.get("session") ?? "";
  const [documentOverride, setDocumentOverride] = useState<EditorCanvasDocument | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const document = resolveEditorDocument(sessionId, documentOverride);

  useEffect(() => {
    if (!sessionId || !auth.user) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setHydrating(true);
      const result = await fetchEditorProject(sessionId);
      if (cancelled) {
        return;
      }
      if (result.ok && result.project) {
        const saved = saveEditorCanvasDocument(result.project);
        setDocumentOverride(saved);
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, sessionId]);

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

  if (sessionId && hydrating && !document) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-600">
        {t("editor.project.loading" as never)}
      </main>
    );
  }

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
