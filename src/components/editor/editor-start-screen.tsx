"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { createEditorProject, fetchEditorProject, fetchEditorProjects, saveEditorProject } from "@/lib/editor-project-client";
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
import {
  listRecentEditorDocuments,
  runEditorVisionAndObjectDetection,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import { buildMotionReadyCharacterWizardHref } from "@/lib/motion-ready-character-routes";
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
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(() => listRecentEditorDocuments());
  const [phase, setPhase] = useState<StartPhase>({ kind: "workflow" });
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

  useEffect(() => {
    if (searchParams.get("workflow") === "combine") {
      setPhase({ kind: "combine_intent", workflow: "combine" });
    }
  }, [searchParams]);

  const finishOpen = async (
    document: EditorCanvasDocument,
    mode: EditorPostUploadMode,
    combineIntent?: EditorFusionIntent
  ) => {
    setOpening(true);
    setError("");
    try {
      const withMode = applyPostUploadMode(document, mode, { combineIntent });
      saveEditorCanvasDocument(withMode);
      const analyzed =
        mode === "export" ? withMode : await runEditorVisionAndObjectDetection(withMode);
      if (auth.user) {
        const existing = await fetchEditorProject(analyzed.sessionId);
        if (existing.ok) {
          await saveEditorProject(analyzed.sessionId, analyzed, analyzed.name);
        } else {
          await createEditorProject(analyzed);
        }
      }
      setRecent(listRecentEditorDocuments());
      onOpenDocument(analyzed);
      setPhase({ kind: "workflow" });
    } catch {
      setError(t("editor.start.uploadFailed"));
    } finally {
      setOpening(false);
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

  const referenceConfig =
    phase.kind === "reference_flow"
      ? resolveReferenceIntakeConfig({
          workflow: phase.workflow,
          intent: phase.combineIntent,
        })
      : null;

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <p className={studioVisual.eyebrowOnDark}>{t("suite.nav.editor")}</p>

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
                              if (auth.user) {
                                void fetchEditorProject(doc.sessionId).then((remote) => {
                                  if (remote.ok && remote.project) {
                                    onOpenDocument(saveEditorCanvasDocument(remote.project));
                                    return;
                                  }
                                  onOpenDocument(doc);
                                });
                                return;
                              }
                              onOpenDocument(doc);
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
                busy={opening}
                onBack={() => {
                  if (phase.workflow === "combine" && phase.combineIntent) {
                    setPhase({ kind: "combine_intent", workflow: "combine" });
                    return;
                  }
                  setPhase({ kind: "workflow" });
                }}
                onClose={() => setPhase({ kind: "workflow" })}
                onComplete={(document) => {
                  void finishOpen(document, phase.workflow, phase.combineIntent);
                }}
              />
              {error ?
                <p className="mt-4 text-sm text-red-200">{error}</p>
              : null}
              </>}
            </>
          : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}
