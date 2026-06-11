"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { createEditorProject, fetchEditorProject, fetchEditorProjects } from "@/lib/editor-project-client";
import { EditorFusionIntentPicker } from "@/components/editor/editor-fusion-intent-picker";
import { EditorWorkflowChooser } from "@/components/editor/editor-workflow-chooser";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  applyPostUploadMode,
  type EditorPostUploadMode,
} from "@/lib/editor-start-flow";
import { combineIntentOption, combineRequiresMultiUpload, workflowProductForMode } from "@/lib/editor-workflow-product";
import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import { applyFusionIntakeDocuments } from "@/lib/editor-fusion-plan";
import {
  createEditorDocumentFromLibrarySource,
  createEditorDocumentFromUpload,
  listRecentEditorDocuments,
  runEditorVisionAndObjectDetection,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  onOpenDocument: (document: EditorCanvasDocument) => void;
};

type StartPhase =
  | { kind: "workflow" }
  | { kind: "combine_intent"; workflow: "combine" }
  | {
      kind: "intake";
      workflow: EditorPostUploadMode;
      combineIntent?: EditorFusionIntent;
      uploadStepIndex?: number;
      stagedDocs?: EditorCanvasDocument[];
    };

export function EditorStartScreen({ onOpenDocument }: Props) {
  const t = useActiveTranslator();
  const auth = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(() => listRecentEditorDocuments());
  const [phase, setPhase] = useState<StartPhase>({ kind: "workflow" });
  const [showRecent, setShowRecent] = useState(false);

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

  const finishOpen = async (
    document: EditorCanvasDocument,
    mode: EditorPostUploadMode,
    combineIntent?: EditorFusionIntent
  ) => {
    const withMode = applyPostUploadMode(document, mode, { combineIntent });
    if (combineIntent === "person_outfit" && mode === "combine") {
      // Outfit reference is applied before open when dual-upload completes.
    }
    saveEditorCanvasDocument(withMode);
    if (auth.user) {
      await createEditorProject(withMode);
    }
    setRecent(listRecentEditorDocuments());
    const analyzed =
      mode === "export" ? withMode : await runEditorVisionAndObjectDetection(withMode);
    onOpenDocument(analyzed);
    setPhase({ kind: "workflow" });
  };

  const openIntake = (workflow: EditorPostUploadMode) => {
    if (workflow === "combine") {
      setPhase({ kind: "combine_intent", workflow: "combine" });
      return;
    }
    setPhase({ kind: "intake", workflow });
  };

  const handleCombineIntent = (intent: EditorFusionIntent) => {
    if (combineRequiresMultiUpload(intent)) {
      setPhase({
        kind: "intake",
        workflow: "combine",
        combineIntent: intent,
        uploadStepIndex: 0,
        stagedDocs: [],
      });
      return;
    }
    setPhase({ kind: "intake", workflow: "combine", combineIntent: intent });
  };

  const handleDocumentReady = async (doc: EditorCanvasDocument) => {
    if (phase.kind !== "intake") {
      return;
    }
    const { workflow, combineIntent, uploadStepIndex, stagedDocs } = phase;

    if (
      workflow === "combine" &&
      combineIntent &&
      uploadStepIndex !== undefined &&
      stagedDocs
    ) {
      const def = fusionIntentDefinition(combineIntent);
      const requiredSteps = def.uploadSteps.filter((s) => !s.optional);
      const nextStaged = [...stagedDocs, doc];
      if (nextStaged.length < requiredSteps.length) {
        setPhase({
          kind: "intake",
          workflow: "combine",
          combineIntent,
          uploadStepIndex: nextStaged.length,
          stagedDocs: nextStaged,
        });
        return;
      }
      const merged = applyFusionIntakeDocuments(
        nextStaged[0]!,
        nextStaged.slice(1),
        combineIntent
      );
      await finishOpen(merged, "combine", combineIntent);
      return;
    }

    await finishOpen(doc, workflow, combineIntent);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const doc = createEditorDocumentFromUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        backgroundUrl: uploaded.workingImageUrl,
        backgroundStorageKey: uploaded.workingStorageKey,
      });
      await handleDocumentReady(doc);
    } catch {
      setError(t("editor.start.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const loadLibrary = async () => {
    setLoadingSources(true);
    setError("");
    const res = await fetchAssetDerivationSources();
    setLoadingSources(false);
    if (!res.ok) {
      setError(t("editor.start.libraryFailed"));
      return;
    }
    setSources(res.data.sources.filter((s) => s.referenceImageUrl?.trim()));
    setShowLibrary(true);
  };

  const intakeTitle = () => {
    if (phase.kind !== "intake") {
      return t("editor.v3.intake.title" as never);
    }
    if (phase.combineIntent && phase.uploadStepIndex !== undefined) {
      const step = fusionIntentDefinition(phase.combineIntent).uploadSteps[phase.uploadStepIndex];
      if (step) {
        return t(step.labelKey as never);
      }
    }
    return t(workflowProductForMode(phase.workflow).titleKey as never);
  };

  const intakeHint = () => {
    if (phase.kind !== "intake") {
      return t("editor.v3.intake.lead" as never);
    }
    if (phase.workflow === "export") {
      return t("editor.v3.workflow.export.standaloneHint" as never);
    }
    if (phase.combineIntent) {
      return t(combineIntentOption(phase.combineIntent).hintKey as never);
    }
    return t(workflowProductForMode(phase.workflow).leadKey as never);
  };

  const renderIntake = () => (
    <>
      <button
        type="button"
        className="mb-4 text-sm font-semibold text-[#0067B1] hover:underline"
        onClick={() => {
          if (phase.kind === "intake" && phase.uploadStepIndex && phase.uploadStepIndex > 0) {
            setPhase({
              kind: "intake",
              workflow: "combine",
              combineIntent: phase.combineIntent,
              uploadStepIndex: phase.uploadStepIndex - 1,
              stagedDocs: phase.stagedDocs?.slice(0, -1),
            });
            return;
          }
          if (phase.kind === "intake" && phase.workflow === "combine" && phase.combineIntent) {
            setPhase({ kind: "combine_intent", workflow: "combine" });
            return;
          }
          setPhase({ kind: "workflow" });
        }}
      >
        {t("editor.v3.back" as never)}
      </button>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">{intakeTitle()}</h1>
      <p className="mt-2 text-sm text-white/80">{intakeHint()}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className={`min-h-[120px] p-5 text-left transition hover:shadow-md ${studioVisual.editorSurface}`}
        >
          <p className="font-semibold text-zinc-900">{t("editor.start.upload")}</p>
          <p className="mt-1 text-sm text-zinc-600">{t("editor.startFlow.uploadHint" as never)}</p>
        </button>
        <button
          type="button"
          disabled={loadingSources}
          onClick={() => void loadLibrary()}
          className={`min-h-[120px] p-5 text-left transition hover:shadow-md ${studioVisual.editorSurface}`}
        >
          <p className="font-semibold text-slate-900">{t("editor.start.chooseLibrary")}</p>
          <p className="mt-1 text-sm text-slate-600">{t("editor.startFlow.libraryHint" as never)}</p>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />

      {error ?
        <p className="mt-4 text-sm text-red-700">{error}</p>
      : null}

      {showLibrary ?
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("editor.start.libraryPicker")}</h2>
            <button type="button" className="text-sm text-zinc-600" onClick={() => setShowLibrary(false)}>
              {t("editor.start.closePicker")}
            </button>
          </div>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {sources.map((source) => (
              <li key={`${source.assetId}-${source.name}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-left hover:bg-zinc-50"
                  onClick={() => {
                    void handleDocumentReady(createEditorDocumentFromLibrarySource(source));
                    setShowLibrary(false);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={source.thumbnailUrl || source.referenceImageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  <span className="text-sm font-medium">{source.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      : null}
    </>
  );

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <p className={studioVisual.eyebrowOnDark}>{t("suite.nav.editor")}</p>

          {phase.kind === "workflow" ?
            <>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                {t("editor.v3.chooser.title" as never)}
              </h1>
              <p className="mt-2 text-sm text-white/80">{t("editor.v3.chooser.lead" as never)}</p>
              <div className="mt-8">
                <EditorWorkflowChooser busy={uploading} onSelectWorkflow={openIntake} />
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
              busy={uploading}
              onSelectIntent={handleCombineIntent}
              onBack={() => setPhase({ kind: "workflow" })}
            />
          : renderIntake()}
        </section>
      </main>
    </StudioAuthGate>
  );
}
