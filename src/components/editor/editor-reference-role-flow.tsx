"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorFusionDynamicQuestionsPanel } from "@/components/editor/editor-fusion-dynamic-questions-panel";
import { EditorFlowStepper, EditorFlowActionBar } from "@/components/editor/editor-flow-stepper";
import { EditorUploadClassifyGate } from "@/components/editor/editor-upload-classify-gate";
import { EditorGenerationCostPanel } from "@/components/editor/editor-generation-cost-panel";
import { EditorFusionWizardProgress } from "@/components/editor/editor-fusion-wizard-progress";
import { EditorFusionWizardResultPanel } from "@/components/editor/editor-fusion-wizard-result-panel";
import { EditorFusionWizardSummaryPanel } from "@/components/editor/editor-fusion-wizard-summary-panel";
import { EditorPlanSummaryPanel } from "@/components/editor/editor-plan-summary-panel";
import { EditorReferenceRoleCard } from "@/components/editor/editor-reference-role-card";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { HomeCheffAssetPickerModal } from "@/components/library/homecheff-asset-picker-modal";
import { useEditorUserAccess } from "@/hooks/use-editor-user-access";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  formatEditorUploadFailureUiMessage,
  resetEditorUploadFlowTraceForTests,
  traceEditorUploadFailure,
  traceEditorUploadFlow,
} from "@/lib/editor-upload-flow-trace";
import { markEditorOpenTiming, recordEditorOpenStage } from "@/lib/editor-open-timing";
import {
  assetPickerSelectionToDerivationSource,
  createEditorDocumentFromLibrarySource,
  createEditorDocumentFromUpload,
} from "@/lib/editor-canvas-session";
import { startScreenPhaseToFlowStep } from "@/lib/editor-flow-steps";
import {
  collectQueuedReferenceAnalysisJobs,
  markReferenceInstancesAnalysisStatus,
  patchReferenceInstanceAnalysis,
  referenceAnalysisProgress,
  runReferenceAnalysesInParallel,
} from "@/lib/editor-reference-role-analysis-runner";
import { createQueuedReferenceAnalysis } from "@/lib/editor-reference-role-analysis";
import {
  applyReferenceRoleIntake,
  createReferenceIntakeState,
  referenceIntakeCostOptions,
  referenceIntakeReady,
} from "@/lib/editor-reference-role-intake";
import { combineIntentOption } from "@/lib/editor-workflow-product";
import { referenceAddedToastVisible } from "@/lib/editor-reference-role-ui";
import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import type { EditorTransformationStepCount } from "@/types/editor-generation-access";
import type { EditorReferenceMetadata } from "@/types/editor-reference-metadata";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type {
  EditorReferenceIntakeState,
  EditorReferenceRoleInstance,
  EditorReferenceRoleSpec,
  EditorWorkflowReferenceConfig,
} from "@/types/editor-reference-role-flow";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import {
  fusionArchetypeForIntent,
} from "@/lib/editor-fusion-archetypes";
import { buildFusionOutputSettings, resolveFusionDynamicQuestions } from "@/lib/editor-fusion-archetype-v2";
import {
  buildFusionQuestionAnswersFromAssistantBootstrap,
  buildFusionSettingsFromAssistantBootstrap,
} from "@/lib/assistant-wizard-prefill-apply";
import type { loadAssistantEditorFusionBootstrap } from "@/lib/assistant-prefill-storage";
import type { FusionOutfitItem } from "@/lib/editor-fusion-archetype-types";
import { patchFusionPlan } from "@/lib/editor-fusion-plan";
import {
  fusionWizardRenderActionKey,
  fusionWorkflowUsesWizardFirst,
} from "@/lib/editor-fusion-wizard-flow";
import { runFusionWizardRenderPipeline } from "@/lib/editor-fusion-wizard-render";

type FlowStep =
    | "reference_roles"
    | "dynamic_questions"
    | "classify"
    | "output_type"
    | "motion_upsell"
    | "plan_review"
    | "fusion_summary"
    | "fusion_rendering"
    | "fusion_result";

type Props = {
  config: EditorWorkflowReferenceConfig;
  combineIntent?: EditorFusionIntent;
  assistantFusionBootstrap?: ReturnType<typeof loadAssistantEditorFusionBootstrap>;
  busy?: boolean;
  submitError?: string;
  onBack: () => void;
  onClose?: () => void;
  onComplete: (document: EditorCanvasDocument) => void;
};

function createInstanceId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultMetadata(roleSpec: EditorReferenceRoleSpec): EditorReferenceMetadata {
  const meta: EditorReferenceMetadata = { role: roleSpec.role };
  if (roleSpec.id === "mother") {
    meta.familyType = "mother";
  }
  if (roleSpec.id === "father") {
    meta.familyType = "father";
  }
  return meta;
}

export function EditorReferenceRoleFlow({
  config,
  combineIntent,
  assistantFusionBootstrap,
  busy,
  submitError = "",
  onBack,
  onClose,
  onComplete,
}: Props) {
  const t = useActiveTranslator();
  const { access } = useEditorUserAccess();
  const fileRef = useRef<HTMLInputElement>(null);
  const [intake, setIntake] = useState<EditorReferenceIntakeState>(() =>
    createReferenceIntakeState({ config })
  );
  const [step, setStep] = useState<FlowStep>("reference_roles");
  const [uploadingRoleId, setUploadingRoleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const [libraryRoleId, setLibraryRoleId] = useState<string | null>(null);
  const [replacingInstanceId, setReplacingInstanceId] = useState<string | null>(null);
  const [recentlyAddedCount, setRecentlyAddedCount] = useState(0);
  const [renderProgressStep, setRenderProgressStep] = useState(0);
  const [renderBusy, setRenderBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultCreditsUsed, setResultCreditsUsed] = useState(0);
  const [resultAnalysisReused, setResultAnalysisReused] = useState(false);
  const [resultDocument, setResultDocument] = useState<EditorCanvasDocument | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [wizardPreviewDocument, setWizardPreviewDocument] = useState<EditorCanvasDocument | null>(null);
  const analysisStartedRef = useRef(new Set<string>());
  const intakeRef = useRef(intake);
  useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);

  const wizardFirstMode = Boolean(
    config.workflow === "combine" && combineIntent && fusionWorkflowUsesWizardFirst(combineIntent)
  );

  const activeFlowStep = startScreenPhaseToFlowStep({
    kind: "reference_flow",
    referenceStep:
      step === "plan_review" ||
      step === "fusion_summary" ||
      step === "fusion_result" ||
      step === "fusion_rendering"
        ? "plan_review"
        : step === "output_type" || step === "motion_upsell"
          ? "output_type"
          : "reference_roles",
  });

  const title = combineIntent
    ? t(combineIntentOption(combineIntent).labelKey as never)
    : t(`editor.v3.workflow.${config.workflow}.title` as never);

  const lead = combineIntent
    ? t(combineIntentOption(combineIntent).hintKey as never)
    : t("editor.referenceRole.lead" as never);

  const costOptions = useMemo(() => referenceIntakeCostOptions(intake), [intake]);
  const displayError = error || submitError;
  const costWorkflow = combineIntent ?? config.intent ?? "custom_composition";
  const rolesReady = referenceIntakeReady(intake);
  const analysisProgress = useMemo(() => referenceAnalysisProgress(intake), [intake]);
  const showFusionQuestions = Boolean(
    combineIntent && resolveFusionDynamicQuestions(combineIntent, { intent: combineIntent, slots: intake.slots }).length > 0
  );
  const fusionArchetype = combineIntent ? fusionArchetypeForIntent(combineIntent) : null;
  const fusionQuestions = combineIntent
    ? resolveFusionDynamicQuestions(combineIntent, { intent: combineIntent, slots: intake.slots })
    : [];
  const showOutputStep = config.supportsVariations || config.supportsSequences;
  const showMotionStep =
    intake.output.outputMode === "sequence" && config.supportsMotionHandoff;

  const computedPreviewDocument = useMemo(() => {
    if (!rolesReady) {
      return null;
    }
    try {
      return applyReferenceRoleIntake(intake);
    } catch {
      return null;
    }
  }, [intake, rolesReady]);

  const previewDocument = useMemo(() => {
    if (wizardFirstMode && wizardPreviewDocument && (step === "fusion_summary" || step === "fusion_rendering")) {
      return wizardPreviewDocument;
    }
    if ((step === "plan_review" || step === "fusion_summary") && computedPreviewDocument) {
      return computedPreviewDocument;
    }
    return null;
  }, [wizardFirstMode, wizardPreviewDocument, step, computedPreviewDocument]);

  const prevStepRef = useRef<FlowStep>(step);
  useEffect(() => {
    if (
      prevStepRef.current !== "fusion_summary" &&
      step === "fusion_summary" &&
      computedPreviewDocument
    ) {
      setWizardPreviewDocument(computedPreviewDocument);
    }
    prevStepRef.current = step;
  }, [step, computedPreviewDocument]);

  useEffect(() => {
    const jobs = collectQueuedReferenceAnalysisJobs(intakeRef.current, analysisStartedRef.current);
    if (jobs.length === 0) {
      return;
    }

    for (const job of jobs) {
      analysisStartedRef.current.add(job.instance.instanceId);
    }

    setIntake((prev) =>
      markReferenceInstancesAnalysisStatus(
        prev,
        jobs.map((job) => job.instance.instanceId),
        "running"
      )
    );

    void runReferenceAnalysesInParallel(
      jobs,
      () => {},
      (instanceId, result) => {
        setIntake((prev) => patchReferenceInstanceAnalysis(prev, instanceId, result));
        traceEditorUploadFlow({
          roleAnalysisCompleted: result.analysis.status === "done",
          bootstrapCompleted: Boolean(
            result.document.visionV6Meta || result.document.visionHierarchy?.length
          ),
        });
      },
      {
        useFusionIntelligence: config.workflow === "combine" && !wizardFirstMode,
        fusionWizardBasicOnly: wizardFirstMode,
        isAdmin: access.billingFree,
        creditsAvailable: access.credits,
      }
    );
  }, [intake.slots, config.workflow, wizardFirstMode, access.billingFree, access.credits]);

  const replaceDocumentInRole = useCallback(
    (roleId: string, instanceId: string, document: EditorCanvasDocument, originalFilename?: string) => {
      analysisStartedRef.current.delete(instanceId);
      setIntake((prev) => ({
        ...prev,
        slots: prev.slots.map((slot) => {
          if (slot.roleId !== roleId) {
            return slot;
          }
          return {
            ...slot,
            instances: slot.instances.map((item) =>
              item.instanceId === instanceId
                ? {
                    ...item,
                    document,
                    analysis: createQueuedReferenceAnalysis(),
                    originalFilename,
                  }
                : item
            ),
          };
        }),
      }));
    },
    []
  );

  const addDocumentToRole = useCallback(
    (roleId: string, document: EditorCanvasDocument, originalFilename?: string) => {
      const roleSpec = config.roles.find((role) => role.id === roleId);
      if (!roleSpec) {
        return;
      }

      const instance: EditorReferenceRoleInstance = {
        instanceId: createInstanceId(),
        document,
        analysis: createQueuedReferenceAnalysis(),
        metadata: defaultMetadata(roleSpec),
        originalFilename,
      };

      setIntake((prev) => ({
        ...prev,
        slots: prev.slots.map((slot) => {
          if (slot.roleId !== roleId) {
            return slot;
          }
          if (slot.instances.length >= roleSpec.maxInstances) {
            return slot;
          }
          return { ...slot, instances: [...slot.instances, instance] };
        }),
      }));
      setRecentlyAddedCount((count) => count + 1);
      window.setTimeout(() => setRecentlyAddedCount((count) => Math.max(0, count - 1)), 4000);
    },
    [config.roles]
  );

  const updateInstanceMetadata = (
    roleId: string,
    instanceId: string,
    metadata: EditorReferenceMetadata
  ) => {
    setIntake((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.roleId === roleId
          ? {
              ...slot,
              instances: slot.instances.map((item) =>
                item.instanceId === instanceId ? { ...item, metadata } : item
              ),
            }
          : slot
      ),
    }));
  };

  const removeInstance = (roleId: string, instanceId: string) => {
    analysisStartedRef.current.delete(instanceId);
    setIntake((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.roleId === roleId
          ? { ...slot, instances: slot.instances.filter((item) => item.instanceId !== instanceId) }
          : slot
      ),
    }));
  };

  const handleUpload = async (file: File, roleId: string) => {
    setUploadingRoleId(roleId);
    setError("");
    resetEditorUploadFlowTraceForTests();
    traceEditorUploadFlow({ uploadStarted: true });
    try {
      const uploaded = await uploadEditorSourceImage(file);
      traceEditorUploadFlow({
        uploadCompleted: true,
        uploadedUrl: uploaded.workingImageUrl,
      });
      markEditorOpenTiming("imageSelectedAt");
      recordEditorOpenStage("photo_loading");
      const doc = createEditorDocumentFromUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        backgroundUrl: uploaded.workingImageUrl,
        backgroundStorageKey: uploaded.workingStorageKey,
      });
      traceEditorUploadFlow({
        documentCreated: true,
        referenceCreated: true,
        sessionCreated: true,
      });
      if (replacingInstanceId) {
        replaceDocumentInRole(roleId, replacingInstanceId, doc, file.name);
        setReplacingInstanceId(null);
      } else {
        addDocumentToRole(roleId, doc, file.name);
      }
    } catch (error) {
      traceEditorUploadFailure({
        step: "uploadCompleted",
        source: "editor-reference-role-flow.handleUpload",
        error,
      });
      setError(
        formatEditorUploadFailureUiMessage({
          failureStep: "uploadCompleted",
          failureMessage: error instanceof Error ? error.message : "unknown_error",
          productionMessage: t("editor.start.uploadFailed"),
        })
      );
    } finally {
      setUploadingRoleId(null);
      setPendingRoleId(null);
    }
  };

  const loadLibrary = async (roleId: string) => {
    setLoadingSources(true);
    setError("");
    const res = await fetchAssetDerivationSources();
    setLoadingSources(false);
    if (!res.ok) {
      setError(t("editor.start.libraryFailed"));
      return;
    }
    setSources(res.data.sources.filter((s) => s.referenceImageUrl?.trim()));
    setLibraryRoleId(roleId);
  };

  const goNext = () => {
    if (step === "reference_roles") {
      if (!rolesReady) {
        return;
      }
      if (showFusionQuestions) {
        setIntake((prev) => {
          if (Object.keys(prev.fusionQuestionAnswers).length > 0 || !combineIntent) {
            return prev;
          }
          const seeded =
            assistantFusionBootstrap && combineIntent
              ? buildFusionSettingsFromAssistantBootstrap(combineIntent, assistantFusionBootstrap)
              : buildFusionOutputSettings(combineIntent, {});
          const answers =
            assistantFusionBootstrap && combineIntent
              ? buildFusionQuestionAnswersFromAssistantBootstrap(combineIntent, assistantFusionBootstrap)
              : (() => {
                  const seededAnswers: Record<string, string | boolean | string[]> = {};
                  for (const question of fusionQuestions) {
                    const value = seeded[question.outputKey as keyof typeof seeded];
                    if (typeof value === "boolean") {
                      seededAnswers[question.id] = value;
                    } else if (typeof value === "string") {
                      seededAnswers[question.id] = value;
                    } else if (Array.isArray(value)) {
                      seededAnswers[question.id] = value.map(String);
                    }
                  }
                  return seededAnswers;
                })();
          return {
            ...prev,
            fusionQuestionAnswers: answers,
            fusionOutputSettings: seeded,
          };
        });
        setStep("dynamic_questions");
        return;
      }
      if (wizardFirstMode) {
        setStep("fusion_summary");
        return;
      }
      if (showOutputStep) {
        setStep("output_type");
        return;
      }
      setStep("classify");
      return;
    }
    if (step === "dynamic_questions" && combineIntent) {
      setIntake((prev) => ({
        ...prev,
        fusionOutputSettings: buildFusionOutputSettings(combineIntent, prev.fusionQuestionAnswers),
      }));
      if (wizardFirstMode) {
        setStep("fusion_summary");
        return;
      }
      if (showOutputStep) {
        setStep("output_type");
        return;
      }
      setStep("classify");
      return;
    }
    if (step === "classify") {
      setStep(wizardFirstMode ? "fusion_summary" : "plan_review");
      return;
    }
    if (step === "output_type") {
      if (showMotionStep) {
        setStep("motion_upsell");
        return;
      }
      setStep(wizardFirstMode ? "fusion_summary" : "plan_review");
      return;
    }
    if (step === "motion_upsell") {
      setStep(wizardFirstMode ? "fusion_summary" : "plan_review");
      return;
    }
    if (step === "fusion_summary") {
      void runFusionWizardRender();
      return;
    }
    onComplete(applyReferenceRoleIntake(intake));
  };

  const runFusionWizardRender = async () => {
    if (!combineIntent || !previewDocument || renderBusy) {
      return;
    }
    setError("");
    setRenderBusy(true);
    setStep("fusion_rendering");
    setRenderProgressStep(0);

    let document = previewDocument;
    if (customPrompt.trim()) {
      const fusion = document.instructionStudioState?.fusionPlan;
      if (fusion) {
        document = patchFusionPlan(document, {
          ...fusion,
          userInstructions: customPrompt.trim(),
        });
      }
    }

    const outcome = await runFusionWizardRenderPipeline({
      intake,
      document,
      combineIntent,
      isAdmin: access.billingFree,
      creditsAvailable: access.credits,
      onProgress: setRenderProgressStep,
      confirmed: true,
    });

    setRenderBusy(false);

    if (!outcome.ok) {
      setStep("fusion_summary");
      if (outcome.code === "credit_gate") {
        setError(
          t("editor.fusionIntelligence.insufficientCredits" as never, {
            credits: outcome.estimatedCredits ?? 0,
          } as never)
        );
        return;
      }
      if (outcome.code === "analysis") {
        setError(t("editor.fusionWizard.error.analysisFailed" as never));
        return;
      }
      setError(t("editor.fusionWizard.error.renderFailed" as never));
      return;
    }

    setIntake(outcome.intake);

    setResultUrl(outcome.resultUrl);
    setResultCreditsUsed(outcome.creditsUsed);
    setResultAnalysisReused(outcome.analysisReused);
    setResultDocument(outcome.document);
    setStep("fusion_result");
  };

  const goBack = () => {
    if (step === "fusion_result") {
      setStep("fusion_summary");
      return;
    }
    if (step === "fusion_rendering") {
      setStep("fusion_summary");
      return;
    }
    if (step === "fusion_summary") {
      if (showFusionQuestions) {
        setStep("dynamic_questions");
        return;
      }
      setStep("reference_roles");
      return;
    }
    if (step === "plan_review") {
      if (showMotionStep && intake.output.outputMode === "sequence") {
        setStep("motion_upsell");
        return;
      }
      if (showOutputStep) {
        setStep("output_type");
        return;
      }
      if (showFusionQuestions) {
        setStep("dynamic_questions");
        return;
      }
      setStep("classify");
      return;
    }
    if (step === "motion_upsell") {
      setStep("output_type");
      return;
    }
    if (step === "output_type") {
      if (showFusionQuestions) {
        setStep("dynamic_questions");
        return;
      }
      setStep("reference_roles");
      return;
    }
    if (step === "classify") {
      if (showFusionQuestions) {
        setStep("dynamic_questions");
        return;
      }
      setStep("reference_roles");
      return;
    }
    if (step === "dynamic_questions") {
      setStep("reference_roles");
      return;
    }
    onBack();
  };

  const renderEmptyRoleCard = (roleSpec: EditorReferenceRoleSpec) => (
    <article
      key={roleSpec.id}
      className={`rounded-2xl border p-4 ${studioVisual.editorSurface} border-zinc-200`}
      data-testid={`reference-role-${roleSpec.id}`}
    >
      <h3 className="text-sm font-semibold text-zinc-900">
        {t(roleSpec.labelKey as never)}
        {!roleSpec.required ?
          <span className="ml-1 text-xs font-normal text-zinc-500">
            ({t("editor.referenceRole.optional" as never)})
          </span>
        : null}
      </h3>
      {roleSpec.hintKey ?
        <p className="mt-1 text-xs text-zinc-600">{t(roleSpec.hintKey as never)}</p>
      : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(uploadingRoleId) || busy}
          onClick={() => {
            setPendingRoleId(roleSpec.id);
            fileRef.current?.click();
          }}
          className="min-h-11 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800"
        >
          {t("editor.start.upload")}
        </button>
        <button
          type="button"
          disabled={loadingSources || busy}
          onClick={() => void loadLibrary(roleSpec.id)}
          className="min-h-11 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800"
        >
          {t("editor.start.chooseLibrary")}
        </button>
      </div>
    </article>
  );

  const renderRoleSection = (roleSpec: EditorReferenceRoleSpec) => {
    const slot = intake.slots.find((s) => s.roleId === roleSpec.id);
    const instances = slot?.instances ?? [];
    const canAddMore = instances.length < roleSpec.maxInstances;

    if (instances.length === 0) {
      return renderEmptyRoleCard(roleSpec);
    }

    return (
      <article
        key={roleSpec.id}
        className={`rounded-2xl border p-4 ${studioVisual.editorSurface} border-zinc-200`}
        data-testid={`reference-role-${roleSpec.id}`}
      >
        <h3 className="text-sm font-semibold text-zinc-900">{t(roleSpec.labelKey as never)}</h3>
        <div className="mt-3 space-y-3">
          {instances.map((instance, index) => (
            <EditorReferenceRoleCard
              key={instance.instanceId}
              roleSpec={roleSpec}
              instanceIndex={index}
              thumbnailUrl={instance.document.backgroundUrl}
              documentName={instance.document.name}
              originalFilename={instance.originalFilename}
              analysis={instance.analysis}
              metadata={instance.metadata}
              uploading={uploadingRoleId === roleSpec.id}
              onMetadataChange={(metadata) =>
                updateInstanceMetadata(roleSpec.id, instance.instanceId, metadata)
              }
              onReplace={() => {
                setPendingRoleId(roleSpec.id);
                setReplacingInstanceId(instance.instanceId);
                fileRef.current?.click();
              }}
              onRemove={() => removeInstance(roleSpec.id, instance.instanceId)}
            />
          ))}
          {canAddMore && roleSpec.maxInstances > 1 ?
            <button
              type="button"
              disabled={Boolean(uploadingRoleId) || busy}
              onClick={() => {
                setPendingRoleId(roleSpec.id);
                fileRef.current?.click();
              }}
              className="text-xs font-semibold text-[#0067B1] hover:underline"
            >
              {t("editor.referenceRole.addReference" as never)}
            </button>
          : null}
        </div>
      </article>
    );
  };

  const renderOutputType = () => (
    <div className="space-y-4" data-testid="reference-output-type">
      <h2 className="text-lg font-bold text-white">{t("editor.referenceRole.output.title" as never)}</h2>
      <p className="text-sm text-white/80">{t("editor.referenceRole.output.lead" as never)}</p>
      <div className="grid gap-3">
        {(["single", "variations", "sequence"] as const).map((mode) => {
          if (mode === "variations" && !config.supportsVariations) {
            return null;
          }
          if (mode === "sequence" && !config.supportsSequences) {
            return null;
          }
          const selected = intake.output.outputMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() =>
                setIntake((prev) => ({
                  ...prev,
                  output: { ...prev.output, outputMode: mode },
                }))
              }
              className={`rounded-2xl border p-4 text-left ${studioVisual.editorSurface} ${
                selected ? "ring-2 ring-[#0067B1]" : ""
              }`}
            >
              <p className="font-semibold text-zinc-900">
                {t(`editor.referenceRole.output.${mode}` as never)}
              </p>
            </button>
          );
        })}
      </div>
      {intake.output.outputMode === "variations" ?
        <div className="flex flex-wrap gap-2">
          {config.variationPresets.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() =>
                setIntake((prev) => ({ ...prev, output: { ...prev.output, variationCount: count } }))
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                intake.output.variationCount === count ? "bg-[#0067B1] text-white" : "bg-zinc-100"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      : null}
      {intake.output.outputMode === "sequence" ?
        <div className="flex flex-wrap gap-2">
          {config.sequencePresets.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() =>
                setIntake((prev) => ({
                  ...prev,
                  output: { ...prev.output, stepCount: count as EditorTransformationStepCount },
                }))
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                intake.output.stepCount === count ? "bg-[#0067B1] text-white" : "bg-zinc-100"
              }`}
            >
              {t("editor.referenceRole.output.steps" as never, { count } as never)}
            </button>
          ))}
        </div>
      : null}
      <EditorGenerationCostPanel user={access} workflow={costWorkflow} options={costOptions} />
    </div>
  );

  const renderMotionUpsell = () => (
    <div className="space-y-4" data-testid="reference-motion-upsell">
      <h2 className="text-lg font-bold text-white">{t("editor.referenceRole.motion.title" as never)}</h2>
      <p className="text-sm text-white/80">{t("editor.referenceRole.motion.lead" as never)}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {([0, 3, 5, 8] as const).map((duration) => {
          const selected =
            duration === 0 ? !intake.motion.enabled : intake.motion.enabled && intake.motion.durationSec === duration;
          return (
            <button
              key={duration}
              type="button"
              onClick={() =>
                setIntake((prev) => ({
                  ...prev,
                  motion: { enabled: duration > 0, durationSec: duration },
                }))
              }
              className={`rounded-xl border p-4 text-left ${studioVisual.editorSurface} ${
                selected ? "ring-2 ring-[#0067B1]" : ""
              }`}
            >
              <p className="font-semibold text-zinc-900">
                {duration === 0
                  ? t("editor.referenceRole.motion.no" as never)
                  : t("editor.referenceRole.motion.animateNow" as never, { seconds: duration } as never)}
              </p>
            </button>
          );
        })}
      </div>
      <EditorGenerationCostPanel user={access} workflow={costWorkflow} options={costOptions} />
    </div>
  );

  return (
    <>
      <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
        <EditorFlowStepper activeStep={activeFlowStep} compact />
      </div>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-white/80">{lead}</p>

      {step === "reference_roles" && analysisProgress.total > 0 ?
        <div
          className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90"
          data-testid="reference-analysis-progress"
        >
          {analysisProgress.pending > 0 ?
            <>
              <p>{t("editor.referenceRole.analysis.backgroundLead" as never)}</p>
              <p className="mt-1 text-xs text-white/75">
                {t("editor.referenceRole.analysis.progress" as never, {
                  done: String(analysisProgress.finished),
                  total: String(analysisProgress.total),
                } as never)}
              </p>
            </>
          : <p>{t("editor.referenceRole.analysis.allDone" as never)}</p>}
        </div>
      : null}

      {step === "reference_roles" && referenceAddedToastVisible("reference_roles", recentlyAddedCount) ?
        <p className="mt-3 text-xs font-medium text-emerald-200" data-testid="reference-added-toast">
          {t("editor.referenceRole.added" as never)}
        </p>
      : null}

      {step === "reference_roles" ?
        <>
          <div className="mt-6 space-y-4">{config.roles.map(renderRoleSection)}</div>
          {displayError ?
            <p className="mt-4 text-sm text-red-200 whitespace-pre-wrap">{displayError}</p>
          : null}
        </>
      : null}

      {step === "output_type" ? renderOutputType() : null}
      {step === "motion_upsell" ? renderMotionUpsell() : null}

      {step === "dynamic_questions" && combineIntent ?
        <div className="mt-6">
          <EditorFusionDynamicQuestionsPanel
            questions={fusionQuestions}
            answers={intake.fusionQuestionAnswers}
            supportsOutfitItems={fusionArchetype?.supportsOutfitItems}
            outfitItems={
              Array.isArray(intake.fusionOutputSettings.outfitItems)
                ? (intake.fusionOutputSettings.outfitItems as unknown as FusionOutfitItem[])
                : []
            }
            onAnswersChange={(fusionQuestionAnswers) =>
              setIntake((prev) => ({ ...prev, fusionQuestionAnswers }))
            }
            onOutfitItemsChange={(outfitItems) =>
              setIntake((prev) => ({
                ...prev,
                fusionOutputSettings: {
                  ...prev.fusionOutputSettings,
                  outfitItems: outfitItems as unknown as string[],
                },
                fusionQuestionAnswers: { ...prev.fusionQuestionAnswers, outfit_items: outfitItems as unknown as string[] },
              }))
            }
          />
        </div>
      : null}

      {step === "classify" ?
        <div className="mt-6">
          <EditorUploadClassifyGate
            uploadUrls={intake.slots.flatMap((slot) =>
              slot.instances.map((i) => i.document.backgroundUrl).filter(Boolean)
            )}
            onConfirm={() => setStep("plan_review")}
            onBack={() => setStep("reference_roles")}
          />
        </div>
      : null}

      {step === "plan_review" && !wizardFirstMode ?
        <div className="mt-6 space-y-4" data-testid="reference-plan-review">
          {previewDocument ?
            <EditorPlanSummaryPanel document={previewDocument} />
          : <HomeCheffOrbitLoader state="preparing_plan" size="md" />}
          {displayError ?
            <p className="whitespace-pre-wrap text-sm text-red-200">{displayError}</p>
          : null}
        </div>
      : null}

      {step === "fusion_summary" && wizardFirstMode && combineIntent ?
        <div className="mt-6 space-y-4">
          {previewDocument ?
            <EditorFusionWizardSummaryPanel
              document={previewDocument}
              intake={intake}
              combineIntent={combineIntent}
              isAdmin={access.billingFree}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
              onDocumentChange={setWizardPreviewDocument}
              onEditReferences={() => setStep("reference_roles")}
            />
          : <HomeCheffOrbitLoader state="preparing_plan" size="md" />}
          {displayError ?
            <p className="whitespace-pre-wrap text-sm text-red-200">{displayError}</p>
          : null}
        </div>
      : null}

      {step === "fusion_rendering" && wizardFirstMode ?
        <div className="mt-6">
          <EditorFusionWizardProgress activeStepIndex={renderProgressStep} />
        </div>
      : null}

      {step === "fusion_result" && wizardFirstMode && resultUrl ?
        <div className="mt-6">
          <EditorFusionWizardResultPanel
            resultUrl={resultUrl}
            creditsUsed={resultCreditsUsed}
            analysisReused={resultAnalysisReused}
            adminFree={access.billingFree}
            onDownload={() => {
              const link = window.document.createElement("a");
              link.href = resultUrl;
              link.download = "fusion-result.png";
              link.click();
            }}
            onMakeAnother={() => {
              setResultUrl(null);
              setResultDocument(null);
              setStep("reference_roles");
              setIntake(createReferenceIntakeState({ config }));
            }}
            onOpenEditor={() => {
              if (resultDocument) {
                onComplete(resultDocument);
              }
            }}
          />
        </div>
      : null}

      {step !== "fusion_rendering" && step !== "fusion_result" ?
      <EditorFlowActionBar
        onBack={goBack}
        onClose={onClose ?? onBack}
        onContinue={goNext}
        continueDisabled={
          (step === "reference_roles" && !rolesReady) ||
          (step === "classify" && false) ||
          ((step === "plan_review" || step === "fusion_summary") && !previewDocument) ||
          renderBusy
        }
        continueLabel={
          step === "fusion_summary" && combineIntent
            ? t(fusionWizardRenderActionKey(combineIntent) as never)
            : step === "plan_review"
              ? t("editor.referenceRole.openEditor" as never)
              : t("editor.referenceRole.continue" as never)
        }
        busy={busy || renderBusy}
      />
      : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const roleId = pendingRoleId;
          if (file && roleId) {
            void handleUpload(file, roleId);
          }
          e.target.value = "";
        }}
      />

      <HomeCheffAssetPickerModal
        open={Boolean(libraryRoleId)}
        initialCategory="images"
        onClose={() => setLibraryRoleId(null)}
        onSelect={(asset) => {
          if (libraryRoleId) {
            const source = assetPickerSelectionToDerivationSource(asset);
            addDocumentToRole(libraryRoleId, createEditorDocumentFromLibrarySource(source), asset.name);
          }
          setLibraryRoleId(null);
        }}
      />
    </>
  );
}

export type { EditorPostUploadMode };
