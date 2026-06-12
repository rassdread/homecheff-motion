"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EditorCanvasWorkspace } from "@/components/editor/editor-canvas-workspace";
import { EditorStartScreen } from "@/components/editor/editor-start-screen";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchEditorProject } from "@/lib/editor-project-client";
import { loadEditorCanvasDocument, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { confirmLeaveEditorProject, editorProjectHasUnsavedVisualChanges } from "@/lib/editor-project-model";
import { hydrateEditorDocumentFromHcProject, loadHcProjectFromQueryResolved } from "@/lib/homecheff-project-open";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
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
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const [documentOverride, setDocumentOverride] = useState<EditorCanvasDocument | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [hcProject, setHcProject] = useState(() =>
    hcProjectId ? loadHomeCheffProject(hcProjectId) : null
  );
  const document = resolveEditorDocument(sessionId, documentOverride);

  useEffect(() => {
    if (!hcProjectId) return;
    let cancelled = false;
    void (async () => {
      setHydrating(true);
      const project = await loadHcProjectFromQueryResolved(searchParams, Boolean(auth.user));
      if (cancelled || !project) {
        setHydrating(false);
        return;
      }
      setHcProject(project);
      const doc = hydrateEditorDocumentFromHcProject(project);
      if (!doc) {
        setHydrating(false);
        return;
      }
      setDocumentOverride(doc);
      if (!sessionId || sessionId !== doc.sessionId) {
        router.replace(
          `/editor?session=${encodeURIComponent(doc.sessionId)}&hcProject=${encodeURIComponent(hcProjectId)}`
        );
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user, hcProjectId, router, searchParams, sessionId]);

  useEffect(() => {
    if (!sessionId || !auth.user || hcProjectId) {
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
        if (saved.instructionStudioState?.hcProjectId) {
          setHcProject(loadHomeCheffProject(saved.instructionStudioState.hcProjectId));
        }
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, hcProjectId, sessionId]);

  const openDocument = (doc: EditorCanvasDocument) => {
    setDocumentOverride(doc);
    const params = new URLSearchParams({ session: doc.sessionId });
    if (doc.instructionStudioState?.hcProjectId) {
      params.set("hcProject", doc.instructionStudioState.hcProjectId);
      setHcProject(loadHomeCheffProject(doc.instructionStudioState.hcProjectId));
    }
    router.replace(`/editor?${params.toString()}`);
  };

  const handleBack = () => {
    if (document && editorProjectHasUnsavedVisualChanges(document)) {
      const ok = confirmLeaveEditorProject(t("editor.project.unsavedWarning" as never));
      if (!ok) {
        return;
      }
    }
    setDocumentOverride(null);
    setHcProject(null);
    router.replace("/editor");
  };

  if ((sessionId || hcProjectId) && hydrating && !document) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <HomeCheffOrbitLoader state="loading" size="md" />
        <p className="text-sm text-zinc-600">{t("editor.project.loading" as never)}</p>
      </main>
    );
  }

  if (sessionId && document) {
    return (
      <>
        {hcProject ?
          <div className="border-b border-sky-100 bg-sky-50/50 px-4 py-2">
            <HcProjectStateBadge project={hcProject} compact />
          </div>
        : null}
        <EditorCanvasWorkspace
          document={document}
          onBack={handleBack}
          onDocumentChange={setDocumentOverride}
        />
      </>
    );
  }

  if (sessionId && !document) {
    return <EditorStartScreen onOpenDocument={openDocument} />;
  }

  return <EditorStartScreen onOpenDocument={openDocument} />;
}
