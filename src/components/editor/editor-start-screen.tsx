"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  listRecentEditorDocuments,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import {
  estimateEditorDocumentSizeKb,
  persistEditorWizardDocument,
  probeEditorLocalStorageAvailable,
} from "@/lib/editor-upload-persist";
import {
  formatEditorUploadFailureUiMessage,
  getLastEditorUploadFlowTrace,
  isEditorUploadDevDiagnosticsEnabled,
  logEditorUploadFailed,
  traceEditorUploadFailure,
  traceEditorUploadFlow,
} from "@/lib/editor-upload-flow-trace";
import { createEditorProject, fetchEditorProject, fetchEditorProjects } from "@/lib/editor-project-client";
import { beginEditorOpenTimingSession, markEditorOpenTiming, recordEditorOpenStage } from "@/lib/editor-open-timing";
import { resolveEditorDocumentOrigin } from "@/lib/editor-project-origin";
import { scheduleIdleTask } from "@/lib/editor-project-restore";
import { buildMotionReadyCharacterWizardHref } from "@/lib/motion-ready-character-routes";
import { EditorFusionIntentPicker } from "@/components/editor/editor-fusion-intent-picker";
import { EditorReferenceRoleFlow } from "@/components/editor/editor-reference-role-flow";
import { EditorFlowStepper } from "@/components/editor/editor-flow-stepper";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { EditorWorkflowChooser } from "@/components/editor/editor-workflow-chooser";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  applyPostUploadMode,
  type EditorPostUploadMode,
} from "@/lib/editor-start-flow";
import { resolveReferenceIntakeConfig } from "@/lib/editor-reference-role-intake";
import { loadAssistantEditorFusionBootstrap } from "@/lib/assistant-prefill-storage";
import { AssistantWizardPrefillBanner } from "@/components/assistant/assistant-wizard-prefill-banner";
import { useAssistantWizardPrefill } from "@/hooks/use-assistant-wizard-prefill";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  onOpenDocument: (document: EditorCanvasDocument) => void;
};

type StartPhase =
  | { kind: "workflow" }
  | { kind: "combine_intent"; workflow: "combine" }
  | {
      kind: "reference_flow";
      workflow: EditorPostUploadMode;
      combineIntent?: EditorFusionIntent;
    };

export function EditorStartScreen({ onOpenDocument }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const { prefill, hasPrefill, clearPrefill } = useAssistantWizardPrefill();
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(() => listRecentEditorDocuments());
  const [phase, setPhase] = useState<StartPhase>(() => {
    if (searchParams.get("workflow") === "combine") {
      return { kind: "combine_intent", workflow: "combine" };
    }
    const bootstrap = typeof window !== "undefined" ? loadAssistantEditorFusionBootstrap() : null;
    if (bootstrap?.fusionIntent === "outfit_from_reference") {
      return { kind: "combine_intent", workflow: "combine" };
    }
    return { kind: "workflow" };
  });
  const [fusionBootstrap] = useState(() =>
    typeof window !== "undefined" ? loadAssistantEditorFusionBootstrap() : null
  );
  const [showRecent, setShowRecent] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!auth.user) {
      return;
    }
    void fetchEditorProjects({ status: "active", limit: 8 }).then(async (result) => {
      if (!result.ok || result.projects.length === 0) {
        setRecent(listRecentEditorDocuments());
        return;
      }
      await Promise.all(
        result.projects.map(async (row) => {
          const remote = await fetchEditorProject(row.id);
          if (remote.ok && remote.project) {
            saveEditorCanvasDocument(remote.project);
          }
        })
      );
      setRecent(listRecentEditorDocuments());
    });
  }, [auth.user]);

  const finishOpen = (
    document: EditorCanvasDocument,
    mode: EditorPostUploadMode,
    combineIntent?: EditorFusionIntent
  ) => {
    setError("");
    const trace = getLastEditorUploadFlowTrace();
    traceEditorUploadFlow({
      uploadCompleted: trace?.uploadCompleted ?? true,
      referenceCreated: true,
      roleAnalysisCompleted: true,
      bootstrapCompleted: Boolean(document.visionV6Meta || document.visionHierarchy?.length),
      documentCreated: true,
      sessionCreated: Boolean(document.sessionId),
    });
    try {
      if (!document.sessionId?.trim() || !document.backgroundUrl?.trim()) {
        const failureMessage = !document.sessionId?.trim()
          ? "missing_session_id"
          : "missing_background_url";
        traceEditorUploadFailure({
          step: "documentCreated",
          source: "editor-start-screen.finishOpen",
          error: new Error(failureMessage),
          log: {
            sessionId: document.sessionId,
            uploadedUrl: document.backgroundUrl,
            localStorageAvailable: probeEditorLocalStorageAvailable(),
          },
        });
        setError(
          formatEditorUploadFailureUiMessage({
            failureStep: "documentCreated",
            failureMessage,
            productionMessage: t("editor.start.uploadFailed"),
          })
        );
        return;
      }

      const withMode = applyPostUploadMode(document, mode, { combineIntent });
      beginEditorOpenTimingSession(withMode.sessionId);
      markEditorOpenTiming("localDocumentSavedAt");

      const persistResult = persistEditorWizardDocument(withMode);
      const localStorageAvailable = probeEditorLocalStorageAvailable();

      traceEditorUploadFlow({
        documentSaved: persistResult.persisted,
        sessionCreated: Boolean(withMode.sessionId),
      });

      logEditorUploadFailed({
        failureStep: persistResult.persisted ? null : "documentSaved",
        failureSource: persistResult.persisted ? null : "editor-start-screen.finishOpen",
        failureMessage: persistResult.persisted
          ? null
          : persistResult.attempts.at(-1)?.tier === "minimal"
            ? "localStorage_write_failed_all_tiers"
            : "localStorage_write_failed",
        saveResult: persistResult,
        sessionId: withMode.sessionId,
        uploadedUrl: trace?.uploadedUrl ?? withMode.backgroundUrl,
        persisted: persistResult.persisted,
        storageWarning: persistResult.storageWarning,
        localStorageAvailable,
        documentSizeKb: estimateEditorDocumentSizeKb(persistResult.document),
      });

      if (!persistResult.persisted) {
        scheduleIdleTask(() => {
          void persistEditorWizardDocument(withMode);
        });
        if (isEditorUploadDevDiagnosticsEnabled()) {
          setError(
            formatEditorUploadFailureUiMessage({
              failureStep: "documentSaved",
              failureMessage: "localStorage_unavailable_opening_in_memory",
              productionMessage: t("editor.start.uploadFailed"),
            })
          );
        }
      }

      recordEditorOpenStage("editor_opening");
      markEditorOpenTiming("routeStartedAt");
      setRecent(listRecentEditorDocuments());
      onOpenDocument(persistResult.document);
      traceEditorUploadFlow({ editorOpened: true });
      setPhase({ kind: "workflow" });
      if (auth.user) {
        scheduleIdleTask(() => {
          void createEditorProject(persistResult.document);
        });
      }
    } catch (error) {
      traceEditorUploadFailure({
        step: "documentSaved",
        source: "editor-start-screen.finishOpen",
        error,
        log: {
          sessionId: document.sessionId,
          uploadedUrl: document.backgroundUrl,
          localStorageAvailable: probeEditorLocalStorageAvailable(),
          documentSizeKb: estimateEditorDocumentSizeKb(document),
        },
      });
      setError(
        formatEditorUploadFailureUiMessage({
          failureStep: "documentSaved",
          failureMessage: error instanceof Error ? error.message : "unknown_error",
          productionMessage: t("editor.start.uploadFailed"),
        })
      );
    }
  };

  const openReferenceFlow = (workflow: EditorPostUploadMode, combineIntent?: EditorFusionIntent) => {
    if (workflow === "motion_prepare") {
      router.push(buildMotionReadyCharacterWizardHref());
      return;
    }
    if (workflow === "combine" && !combineIntent) {
      setPhase({ kind: "combine_intent", workflow: "combine" });
      return;
    }
    setPhase({ kind: "reference_flow", workflow, combineIntent });
  };

  const handleCombineIntent = (intent: EditorFusionIntent) => {
    openReferenceFlow("combine", intent);
  };

  useEffect(() => {
    if (fusionBootstrap?.fusionIntent === "outfit_from_reference") {
      openReferenceFlow("combine", "outfit_from_reference");
    }
  }, [fusionBootstrap]);

  const referenceConfig =
    phase.kind === "reference_flow"
      ? resolveReferenceIntakeConfig({
          workflow: phase.workflow,
          intent: phase.combineIntent,
        })
      : null;

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`${studioVisual.pageRoot} ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <p className={studioVisual.eyebrowOnDark}>{t("suite.nav.editor")}</p>

          {hasPrefill && prefill ? (
            <div className="mb-4">
              <AssistantWizardPrefillBanner
                prefill={prefill}
                onClear={clearPrefill}
                onAdjust={() => {
                  if (phase.kind === "reference_flow") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            </div>
          ) : null}

          {phase.kind === "workflow" ?
            <>
              <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                <EditorFlowStepper activeStep="workflow" compact />
              </div>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                {t("editor.v3.chooser.title" as never)}
              </h1>
              <p className="mt-2 text-sm text-white/80">{t("editor.v3.chooser.lead" as never)}</p>
              <div className="mt-8">
                <EditorWorkflowChooser
                  busy={opening}
                  onSelectWorkflow={(workflow) => openReferenceFlow(workflow)}
                />
              </div>

              {recent.length > 0 ?
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => setShowRecent((v) => !v)}
                    className="text-sm font-semibold text-white/90 hover:underline"
                  >
                    {t("editor.startFlow.continueRecent" as never)}
                  </button>
                  {showRecent ?
                    <ul className="mt-3 space-y-2 text-left">
                      {recent.map((doc) => (
                        <li key={doc.sessionId}>
                          <button
                            type="button"
                            onClick={() => {
                              const origin = resolveEditorDocumentOrigin(doc);
                              if (!auth.user || origin === "local") {
                                onOpenDocument(doc);
                                return;
                              }
                              void fetchEditorProject(doc.sessionId).then((remote) => {
                                if (remote.ok && remote.project) {
                                  onOpenDocument(saveEditorCanvasDocument(remote.project));
                                  return;
                                }
                                onOpenDocument(doc);
                              });
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-left text-sm hover:bg-white"
                          >
                            <span className="font-medium text-zinc-900">{doc.name}</span>
                            <span className="text-xs text-zinc-500">{doc.status}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  : null}
                </div>
              : null}
            </>
          : phase.kind === "combine_intent" ?
            <EditorFusionIntentPicker
              busy={opening}
              onSelectIntent={handleCombineIntent}
              onBack={() => setPhase({ kind: "workflow" })}
            />
          : referenceConfig ?
            <>
              {opening ?
                <div className="flex min-h-[40vh] items-center justify-center">
                  <HomeCheffOrbitLoader state="loading" size="lg" />
                </div>
              : <>
              <EditorReferenceRoleFlow
                key={`${phase.workflow}-${phase.combineIntent ?? "none"}`}
                config={referenceConfig}
                combineIntent={phase.combineIntent}
                assistantFusionBootstrap={fusionBootstrap}
                busy={opening}
                submitError={error}
                onBack={() => {
                  if (phase.workflow === "combine" && phase.combineIntent) {
                    setPhase({ kind: "combine_intent", workflow: "combine" });
                    return;
                  }
                  setPhase({ kind: "workflow" });
                }}
                onClose={() => setPhase({ kind: "workflow" })}
                onComplete={(document) => {
                  finishOpen(document, phase.workflow, phase.combineIntent);
                }}
              />
              {error && phase.kind !== "reference_flow" ?
                <p className="mt-4 whitespace-pre-wrap text-sm text-red-200">{error}</p>
              : null}
              </>}
            </>
          : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}
