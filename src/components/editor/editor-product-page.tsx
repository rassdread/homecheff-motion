"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EditorSessionRecoveryPanel } from "@/components/editor/editor-session-recovery-panel";
import { EditorStartScreen } from "@/components/editor/editor-start-screen";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { useAuthSession } from "@/hooks/use-auth-session";
import { enableAdvancedFusionCompose, isAdvancedFusionComposeParam } from "@/lib/editor-fusion-advanced";
import {
  loadEditorCanvasDocument,
  removeEditorCanvasSession,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import {
  isAnalysisBlockingRestore,
  isExplicitServerRestoreRequested,
  recordEditorSessionRestoreSkipped,
  restoreEditorSessionFromServerIfAllowed,
  scheduleIdleProjectRestore,
  shouldSkipEditorSessionServerRestore,
} from "@/lib/editor-project-restore";
import { resolveHcProjectOrigin } from "@/lib/editor-project-origin";
import { sanitizeDocumentForAssetIsolation } from "@/lib/editor-project-isolation";
import { traceOnDocumentChangeStage } from "@/lib/editor-vision-hierarchy-loss-trace";
import { confirmLeaveEditorProject, editorProjectHasUnsavedVisualChanges } from "@/lib/editor-project-model";
import { hydrateEditorDocumentFromHcProject, loadHcProjectFromQueryResolved } from "@/lib/homecheff-project-open";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  buildEditorRouteHref,
  editorRouteQueryNeedsSync,
  normalizeEditorRouteUrl,
  replaceEditorRouteIfNeeded,
  type EditorRouteReplaceReason,
} from "@/lib/editor-route-navigation";
import { buildEditorSessionHydrationDiagnostic } from "@/lib/editor-session-hydration-debug";
import { beginEditorOpenTimingSession, markEditorOpenTiming, recordEditorOpenStage } from "@/lib/editor-open-timing";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

/** S.1 — defer ~3.3k LOC canvas workspace until an editor session is open (ADR-STUDIO-004). */
const EditorCanvasWorkspace = dynamic(
  () =>
    import("@/components/editor/editor-canvas-workspace").then((m) => ({
      default: m.EditorCanvasWorkspace,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-8">
        <HomeCheffOrbitLoader />
      </div>
    ),
  }
);

type SessionHydrationState = "idle" | "loading" | "ready" | "not_found";

function resolveEditorDocument(
  sessionId: string,
  override: EditorCanvasDocument | null,
  storageReady: boolean
): EditorCanvasDocument | null {
  if (!sessionId) {
    return null;
  }
  if (override?.sessionId === sessionId) {
    return override;
  }
  if (!storageReady) {
    return null;
  }
  return loadEditorCanvasDocument(sessionId);
}

function stripStaleHcProjectFromDocument(doc: EditorCanvasDocument): EditorCanvasDocument {
  if (!doc.instructionStudioState?.hcProjectId) {
    return doc;
  }
  return {
    ...doc,
    instructionStudioState: {
      ...doc.instructionStudioState,
      hcProjectId: undefined,
    },
  };
}

export function EditorProductPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const sessionId = searchParams.get("session") ?? "";
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const [documentOverride, setDocumentOverride] = useState<EditorCanvasDocument | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [hydrationState, setHydrationState] = useState<SessionHydrationState>(() =>
    sessionId ? "loading" : "idle"
  );
  const [hcProject, setHcProject] = useState<HomeCheffProjectPackage | null>(null);
  const sessionRestoreRef = useRef<string | null>(null);
  const hcRestoreRef = useRef<string | null>(null);
  const pendingOpenSessionRef = useRef<string | null>(null);
  const lastSyncedRouteRef = useRef<string | null>(null);
  const document = resolveEditorDocument(sessionId, documentOverride, storageReady);

  const syncEditorRoute = (
    target: { session?: string; hcProject?: string; stripRestoreServer?: boolean },
    reason: EditorRouteReplaceReason
  ): boolean => {
    const href = buildEditorRouteHref(target, searchParams, pathname);
    const normalized = normalizeEditorRouteUrl(href);
    if (lastSyncedRouteRef.current === normalized) {
      return false;
    }
    if (!editorRouteQueryNeedsSync(searchParams, target)) {
      lastSyncedRouteRef.current = normalized;
      return false;
    }
    const applied = replaceEditorRouteIfNeeded(router, searchParams, target, reason, pathname);
    if (applied) {
      lastSyncedRouteRef.current = normalized;
    }
    return applied;
  };

  const reportHydrationFailure = (
    failureReason: import("@/lib/editor-session-hydration-debug").EditorSessionHydrationFailureReason
  ) => {
    buildEditorSessionHydrationDiagnostic({
      sessionId,
      document,
      documentOverride,
      userId: auth.user?.id ?? null,
      ownerUserId: hcProject?.ownerId ?? document?.instructionStudioState?.hcProjectId ?? null,
      storageReady,
      hydrationState: "not_found",
      failureReason,
    });
  };

  useEffect(() => {
    queueMicrotask(() => {
      setStorageReady(true);
    });
  }, []);

  useEffect(() => {
    sessionRestoreRef.current = null;
    hcRestoreRef.current = null;
    lastSyncedRouteRef.current = normalizeEditorRouteUrl(
      buildEditorRouteHref(
        {
          session: sessionId || undefined,
          hcProject: hcProjectId || undefined,
        },
        undefined,
        pathname
      )
    );
    const pendingOpen =
      pendingOpenSessionRef.current === sessionId || documentOverride?.sessionId === sessionId;
    if (!pendingOpen) {
      setHydrationState(sessionId || hcProjectId ? "loading" : "idle");
    }
  }, [documentOverride?.sessionId, hcProjectId, pathname, sessionId]);

  useEffect(() => {
    if (!hcProjectId || !storageReady) {
      return;
    }
    if (hcRestoreRef.current === hcProjectId) {
      return;
    }
    hcRestoreRef.current = hcProjectId;

    const localHc = loadHomeCheffProject(hcProjectId);
    if (localHc) {
      setHcProject(localHc);
      if (sessionId) {
        const localDoc = loadEditorCanvasDocument(sessionId);
        if (localDoc) {
          setDocumentOverride(sanitizeDocumentForAssetIsolation(localDoc));
          setHydrationState("ready");
          return;
        }
      } else {
        const doc = hydrateEditorDocumentFromHcProject(localHc);
        if (doc) {
          setDocumentOverride(sanitizeDocumentForAssetIsolation(doc));
          setHydrationState("ready");
          return;
        }
      }
    }

    let cancelled = false;
    void (async () => {
      setHydrationState("loading");
      const analysisStatus = document?.visionAnalysisRun?.status ?? null;
      const project = await loadHcProjectFromQueryResolved(searchParams, {
        syncFromServer: Boolean(auth.user),
        skipServerWithoutLocal: Boolean(sessionId),
        userRequestedRestore: !localHc,
        analysisStatus,
      });
      if (cancelled) {
        return;
      }
      if (!project) {
        if (sessionId) {
          const localDoc = loadEditorCanvasDocument(sessionId);
          if (localDoc) {
            const cleaned = stripStaleHcProjectFromDocument(localDoc);
            const saved = saveEditorCanvasDocument(sanitizeDocumentForAssetIsolation(cleaned));
            setDocumentOverride(saved);
            setHcProject(null);
            syncEditorRoute({ session: sessionId, stripRestoreServer: true }, "stale_hc_removed");
            setHydrationState("ready");
            return;
          }
        }
        setHydrationState("not_found");
        reportHydrationFailure("hc_project_hydrate_failed");
        return;
      }
      setHcProject(project);
      const doc = hydrateEditorDocumentFromHcProject(project);
      if (!doc) {
        setHydrationState("not_found");
        reportHydrationFailure("hc_project_hydrate_failed");
        return;
      }
      setDocumentOverride(sanitizeDocumentForAssetIsolation(doc));
      syncEditorRoute(
        {
          session: doc.sessionId,
          hcProject: hcProjectId,
          stripRestoreServer: true,
        },
        "hc_synced"
      );
      setHydrationState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user, document?.visionAnalysisRun?.status, hcProjectId, router, searchParams, sessionId, storageReady]);

  useEffect(() => {
    if (!sessionId || hcProjectId || !storageReady) {
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

    const local = resolveEditorDocument(sessionId, documentOverride, storageReady);
    const explicitRestore = isExplicitServerRestoreRequested(searchParams);
    const analysisStatus = local?.visionAnalysisRun?.status ?? null;

    if (local) {
      const skip = shouldSkipEditorSessionServerRestore({
        sessionId,
        document: local,
        userRequestedRestore: explicitRestore,
        analysisStatus,
      });
      if (skip.skip) {
        recordEditorSessionRestoreSkipped({
          sessionId,
          document: local,
          reason: skip.reason,
          analysisStatus: analysisStatus ?? "idle",
        });
        setDocumentOverride(sanitizeDocumentForAssetIsolation(local));
        setHydrationState("ready");
        if (explicitRestore) {
          syncEditorRoute({ session: sessionId, stripRestoreServer: true }, "restore_server_removed");
        }
        return;
      }
    }

    if (!explicitRestore) {
      recordEditorSessionRestoreSkipped({
        sessionId,
        document: local,
        reason: local ? "local_copy_present" : "local_first_session",
        analysisStatus: analysisStatus ?? "idle",
      });
      if (local) {
        pendingOpenSessionRef.current = null;
        setDocumentOverride(sanitizeDocumentForAssetIsolation(local));
        setHydrationState("ready");
      } else {
        setHydrationState("not_found");
        reportHydrationFailure("local_document_missing");
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      setHydrationState("loading");
      const { project: remote } = await restoreEditorSessionFromServerIfAllowed({
        sessionId,
        document: local,
        analysisStatus,
        userRequestedRestore: true,
        originHint: "server",
      });
      if (cancelled) {
        return;
      }
      if (remote) {
        const saved = saveEditorCanvasDocument(sanitizeDocumentForAssetIsolation(remote));
        setDocumentOverride(saved);
        if (saved.instructionStudioState?.hcProjectId) {
          const linkedHc = loadHomeCheffProject(saved.instructionStudioState.hcProjectId);
          if (linkedHc) {
            setHcProject(linkedHc);
          }
        }
        setHydrationState("ready");
        return;
      }
      setHydrationState("not_found");
      reportHydrationFailure("server_restore_failed");
    })();
    return () => {
      cancelled = true;
    };
  }, [
    auth.resolved,
    auth.user?.id,
    document,
    documentOverride,
    hcProjectId,
    searchParams,
    sessionId,
    storageReady,
  ]);

  useEffect(() => {
    if (!document || !sessionId || !storageReady || !auth.user) {
      return;
    }
    if (isAnalysisBlockingRestore(document.visionAnalysisRun?.status)) {
      return;
    }
    const hcId = document.instructionStudioState?.hcProjectId;
    const hcOrigin = hcId ? resolveHcProjectOrigin(loadHomeCheffProject(hcId)) : document.projectOrigin;
    if (document.projectOrigin === "local" && hcOrigin === "local") {
      return;
    }
    return scheduleIdleProjectRestore({
      sessionId,
      hcProjectId: hcId,
      document,
      syncUser: true,
    });
  }, [
    auth.user,
    document,
    document?.instructionStudioState?.hcProjectId,
    document?.projectOrigin,
    document?.visionAnalysisRun?.status,
    sessionId,
    storageReady,
  ]);

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
    const saved = saveEditorCanvasDocument(sanitizeDocumentForAssetIsolation(doc));
    pendingOpenSessionRef.current = saved.sessionId;
    setDocumentOverride(saved);
    sessionRestoreRef.current = saved.sessionId;
    setHydrationState("ready");
    markEditorOpenTiming("localDocumentSavedAt");
    beginEditorOpenTimingSession(saved.sessionId);
    recordEditorOpenStage("editor_opening");
    markEditorOpenTiming("routeStartedAt");
    const hcId = saved.instructionStudioState?.hcProjectId;
    const linkedHc = hcId ? loadHomeCheffProject(hcId) : null;
    if (linkedHc && hcId) {
      setHcProject(linkedHc);
      syncEditorRoute(
        {
          session: saved.sessionId,
          hcProject: hcId,
          stripRestoreServer: true,
        },
        "hc_synced"
      );
      return;
    }
    syncEditorRoute({ session: saved.sessionId, stripRestoreServer: true }, "session_synced");
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
    syncEditorRoute({ stripRestoreServer: true }, "route_cleared");
  };

  const handleNewProject = () => {
    sessionRestoreRef.current = null;
    hcRestoreRef.current = null;
    handleBack();
  };

  const handleRemoveBrokenSession = () => {
    if (sessionId) {
      removeEditorCanvasSession(sessionId);
    }
    setDocumentOverride(null);
    sessionRestoreRef.current = null;
    setHydrationState("idle");
    syncEditorRoute({ stripRestoreServer: true }, "stale_session_removed");
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

  if ((sessionId || hcProjectId) && !document && (hydrationState === "loading" || !storageReady)) {
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
          onNewProject={handleNewProject}
          onDocumentChange={(next) => {
            traceOnDocumentChangeStage(next);
            setDocumentOverride(next);
            const urlSession = searchParams.get("session")?.trim() ?? "";
            const urlHc = searchParams.get("hcProject")?.trim() ?? "";
            const docHc = next.instructionStudioState?.hcProjectId?.trim() ?? "";
            const hcLocal = docHc ? loadHomeCheffProject(docHc) : null;
            const targetHc = hcLocal ? docHc : undefined;

            if (urlSession === next.sessionId && urlHc === (targetHc ?? "")) {
              return;
            }

            if (targetHc) {
              syncEditorRoute(
                {
                  session: next.sessionId,
                  hcProject: targetHc,
                  stripRestoreServer: true,
                },
                "hc_synced"
              );
              return;
            }

            if (urlSession !== next.sessionId || urlHc) {
              syncEditorRoute(
                { session: next.sessionId, stripRestoreServer: true },
                urlHc ? "stale_hc_removed" : "session_synced"
              );
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
