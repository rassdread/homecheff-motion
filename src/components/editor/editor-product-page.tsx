"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EditorCanvasWorkspace } from "@/components/editor/editor-canvas-workspace";
import { EditorSessionRecoveryPanel } from "@/components/editor/editor-session-recovery-panel";
import { EditorStartScreen } from "@/components/editor/editor-start-screen";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { useAuthSession } from "@/hooks/use-auth-session";
import { enableAdvancedFusionCompose, isAdvancedFusionComposeParam } from "@/lib/editor-fusion-advanced";
import { fetchEditorProject } from "@/lib/editor-project-client";
import {
  loadEditorCanvasDocument,
  removeEditorCanvasSession,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import { mergePreservingVisionAnalysis } from "@/lib/editor-vision-v6-stability";
import { confirmLeaveEditorProject, editorProjectHasUnsavedVisualChanges } from "@/lib/editor-project-model";
import { hydrateEditorDocumentFromHcProject, loadHcProjectFromQueryResolved } from "@/lib/homecheff-project-open";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { replaceEditorRouteIfNeeded } from "@/lib/editor-route-navigation";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type SessionHydrationState = "idle" | "loading" | "ready" | "not_found";

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
  const [hydrationState, setHydrationState] = useState<SessionHydrationState>(() =>
    sessionId ? "loading" : "idle"
  );
  const [hcProject, setHcProject] = useState(() =>
    hcProjectId ? loadHomeCheffProject(hcProjectId) : null
  );
  const sessionRestoreRef = useRef<string | null>(null);
  const hcRestoreRef = useRef<string | null>(null);
  const document = resolveEditorDocument(sessionId, documentOverride);

  useEffect(() => {
    sessionRestoreRef.current = null;
    hcRestoreRef.current = null;
    setHydrationState(sessionId || hcProjectId ? "loading" : "idle");
  }, [sessionId, hcProjectId]);

  useEffect(() => {
    if (!hcProjectId) {
      return;
    }
    if (hcRestoreRef.current === hcProjectId) {
      return;
    }
    hcRestoreRef.current = hcProjectId;

    let cancelled = false;
    void (async () => {
      setHydrationState("loading");
      const project = await loadHcProjectFromQueryResolved(searchParams, Boolean(auth.user));
      if (cancelled || !project) {
        setHydrationState("not_found");
        return;
      }
      setHcProject(project);
      const doc = hydrateEditorDocumentFromHcProject(project);
      if (!doc) {
        setHydrationState("not_found");
        return;
      }
      setDocumentOverride(doc);
      replaceEditorRouteIfNeeded(router, searchParams, {
        session: doc.sessionId,
        hcProject: hcProjectId,
      });
      setHydrationState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user, hcProjectId, router, searchParams, sessionId]);

  useEffect(() => {
    if (!sessionId || hcProjectId) {
      return;
    }
    if (!auth.resolved) {
      return;
    }
    if (!auth.user) {
      setHydrationState(document ? "ready" : "idle");
      return;
    }
    if (sessionRestoreRef.current === sessionId) {
      return;
    }
    sessionRestoreRef.current = sessionId;

    const local = loadEditorCanvasDocument(sessionId);
    if (local) {
      setDocumentOverride(local);
      setHydrationState("ready");
    }

    let cancelled = false;
    void (async () => {
      if (!local) {
        setHydrationState("loading");
      }
      const result = await fetchEditorProject(sessionId);
      if (cancelled) {
        return;
      }
      if (result.ok && result.project) {
        const merged = mergePreservingVisionAnalysis(local ?? result.project, result.project);
        const saved = saveEditorCanvasDocument(merged);
        setDocumentOverride(saved);
        if (saved.instructionStudioState?.hcProjectId) {
          setHcProject(loadHomeCheffProject(saved.instructionStudioState.hcProjectId));
        }
        setHydrationState("ready");
        return;
      }
      if (local) {
        setHydrationState("ready");
        return;
      }
      setHydrationState("not_found");
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.resolved, auth.user?.id, hcProjectId, sessionId]);

  useEffect(() => {
    if (!document || !sessionId) {
      return;
    }
    if (!isAdvancedFusionComposeParam(searchParams)) {
      return;
    }
    if (document.editorFlowMode !== "combine") {
      return;
    }
    if (document.instructionStudioState?.advancedFusionCompose) {
      return;
    }
    setDocumentOverride(enableAdvancedFusionCompose(document));
  }, [document, searchParams, sessionId]);

  const openDocument = (doc: EditorCanvasDocument) => {
    setDocumentOverride(doc);
    sessionRestoreRef.current = doc.sessionId;
    setHydrationState("ready");
    const params = { session: doc.sessionId };
    if (doc.instructionStudioState?.hcProjectId) {
      setHcProject(loadHomeCheffProject(doc.instructionStudioState.hcProjectId));
      replaceEditorRouteIfNeeded(router, searchParams, {
        session: doc.sessionId,
        hcProject: doc.instructionStudioState.hcProjectId,
      });
      return;
    }
    replaceEditorRouteIfNeeded(router, searchParams, params);
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
    sessionRestoreRef.current = null;
    hcRestoreRef.current = null;
    setHydrationState("idle");
    replaceEditorRouteIfNeeded(router, searchParams, {});
  };

  const handleRemoveBrokenSession = () => {
    if (sessionId) {
      removeEditorCanvasSession(sessionId);
    }
    setDocumentOverride(null);
    sessionRestoreRef.current = null;
    setHydrationState("idle");
    replaceEditorRouteIfNeeded(router, searchParams, {});
  };

  if (sessionId && hydrationState === "not_found" && !document) {
    return (
      <EditorSessionRecoveryPanel
        sessionId={sessionId}
        onBackToEditor={handleBack}
        onStartNew={() => {
          handleRemoveBrokenSession();
        }}
        onRemoveBrokenSession={handleRemoveBrokenSession}
      />
    );
  }

  if ((sessionId || hcProjectId) && !document && hydrationState === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <HomeCheffOrbitLoader state="loading" size="md" />
        <p className="text-sm text-white/80">{t("editor.project.loading" as never)}</p>
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
          onDocumentChange={(next) => {
            setDocumentOverride(next);
            const hcId = next.instructionStudioState?.hcProjectId;
            if (hcId) {
              replaceEditorRouteIfNeeded(router, searchParams, {
                session: next.sessionId,
                hcProject: hcId,
              });
            }
          }}
        />
      </>
    );
  }

  if (sessionId && !document) {
    return <EditorStartScreen onOpenDocument={openDocument} />;
  }

  return <EditorStartScreen onOpenDocument={openDocument} />;
}
