"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorFlowActionBar } from "@/components/editor/editor-flow-stepper";
import { EditorFusionWizardAdvancedSettings } from "@/components/editor/editor-fusion-wizard-advanced-settings";
import { EditorBrandProtectionBanner } from "@/components/editor/editor-brand-protection-banner";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { EditorWizardWorkflowPricingPanel, formatWizardMakeButtonLabel } from "@/components/editor/editor-wizard-workflow-pricing-panel";
import { EditorFusionWizardProgress } from "@/components/editor/editor-fusion-wizard-progress";
import { EditorFusionWizardResultPanel } from "@/components/editor/editor-fusion-wizard-result-panel";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { useEditorUserAccess } from "@/hooks/use-editor-user-access";
import { useActiveTranslator } from "@/i18n/client";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  applyReferenceRoleIntake,
} from "@/lib/editor-reference-role-intake";
import {
  collectQueuedReferenceAnalysisJobs,
  markReferenceInstancesAnalysisStatus,
  patchReferenceInstanceAnalysis,
  runReferenceAnalysesInParallel,
} from "@/lib/editor-reference-role-analysis-runner";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  formatEditorUploadFailureUiMessage,
  traceEditorUploadFailure,
} from "@/lib/editor-upload-flow-trace";
import {
  buildMascotTransformIntake,
  buildTransformationBlueprint,
  MASCOT_TRANSFORM_PRESERVE_I18N,
  MASCOT_TRANSFORM_TARGET_I18N,
  MASCOT_TRANSFORM_WORKFLOW,
  resolveMascotTransformFusionIntent,
} from "@/lib/editor-mascot-transformation";
import { resolveWizardPipelineErrorCopy } from "@/lib/wizard-user-copy";
import { resolveWizardWorkflowPriceFromIntake } from "@/lib/wizard-workflow-pricing";
import { runFusionWizardRenderPipeline } from "@/lib/editor-fusion-wizard-render";
import { CharacterStudioResultNextSteps } from "@/components/character-studio/character-studio-result-next-steps";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { loadAssistantEditorFusionBootstrap } from "@/lib/assistant-prefill-storage";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import {
  MASCOT_TRANSFORM_TARGET_TYPES,
  type MascotTransformPreserveOption,
  type MascotTransformSourceType,
  type MascotTransformTargetType,
} from "@/types/editor-mascot-transformation";

type WizardStep =
  | "choose_target"
  | "upload"
  | "preserve"
  | "extra_wish"
  | "summary"
  | "rendering"
  | "result";

type Props = {
  initialTarget?: MascotTransformTargetType;
  initialUserIntent?: string;
  initialSourceType?: MascotTransformSourceType;
  assistantBootstrap?: ReturnType<typeof loadAssistantEditorFusionBootstrap>;
  onBack: () => void;
  onOpenEditor?: (document: EditorCanvasDocument) => void;
};

export function EditorMascotTransformationWizard({
  initialTarget,
  initialUserIntent = "",
  initialSourceType = "mascot",
  assistantBootstrap,
  onBack,
  onOpenEditor,
}: Props) {
  const t = useActiveTranslator();
  const { access } = useEditorUserAccess();
  const fileRef = useRef<HTMLInputElement>(null);
  const analysisStartedRef = useRef(new Set<string>());

  const [step, setStep] = useState<WizardStep>(() =>
    initialTarget ? "upload" : "choose_target"
  );
  const [targetType, setTargetType] = useState<MascotTransformTargetType | null>(
    initialTarget ?? null
  );
  const [sourceType, setSourceType] = useState<MascotTransformSourceType>(initialSourceType);
  const [preserve, setPreserve] = useState<MascotTransformPreserveOption[]>([
    "colors",
    "eyes",
    "logo",
    "accessories",
  ]);
  const [userIntent, setUserIntent] = useState(
    initialUserIntent || assistantBootstrap?.questionAnswers?.user_intent || ""
  );
  const [intake, setIntake] = useState<EditorReferenceIntakeState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [previewDocument, setPreviewDocument] = useState<EditorCanvasDocument | null>(null);
  const [renderProgressStep, setRenderProgressStep] = useState(0);
  const [renderBusy, setRenderBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultCreditsUsed, setResultCreditsUsed] = useState(0);
  const [resultAnalysisReused, setResultAnalysisReused] = useState(false);
  const [resultDocument, setResultDocument] = useState<EditorCanvasDocument | null>(null);

  const combineIntent = useMemo(() => {
    if (!targetType) {
      return null;
    }
    return resolveMascotTransformFusionIntent(targetType, sourceType);
  }, [targetType, sourceType]);

  const blueprint = useMemo(() => {
    if (!targetType) {
      return null;
    }
    return buildTransformationBlueprint({
      targetType,
      preserve,
      userIntent,
      sourceType,
      advanced: { customPrompt },
    });
  }, [targetType, preserve, userIntent, sourceType, customPrompt]);

  const mascotBrandProtection = useMemo(() => {
    const sourceUrl = intake?.slots[0]?.instances[0]?.document.backgroundUrl;
    return buildBrandAssetProtectionLayer({
      workflowType: "mascot_transform",
      mascotPreserveLogo: preserve.includes("logo"),
      profiles: sourceUrl ? [{ referenceId: "mascot_source", imageUrl: sourceUrl }] : [],
      userPreserveLogoExact: preserve.includes("logo"),
    });
  }, [intake, preserve]);

  useEffect(() => {
    if (!intake) {
      return;
    }
    const jobs = collectQueuedReferenceAnalysisJobs(intake, analysisStartedRef.current);
    if (jobs.length === 0) {
      return;
    }
    for (const job of jobs) {
      analysisStartedRef.current.add(job.instance.instanceId);
    }
    setIntake((prev) =>
      prev
        ? markReferenceInstancesAnalysisStatus(
            prev,
            jobs.map((job) => job.instance.instanceId),
            "running"
          )
        : prev
    );
    void runReferenceAnalysesInParallel(
      jobs,
      () => {},
      (instanceId, result) => {
        setIntake((prev) => (prev ? patchReferenceInstanceAnalysis(prev, instanceId, result) : prev));
      },
      {
        useFusionIntelligence: false,
        fusionWizardBasicOnly: true,
        isAdmin: access.billingFree,
        creditsAvailable: access.credits,
      }
    );
  }, [intake?.slots, access.billingFree, access.credits]);

  const handleUpload = async (file: File) => {
    if (!targetType) {
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const doc = createEditorDocumentFromUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        backgroundUrl: uploaded.workingImageUrl,
        backgroundStorageKey: uploaded.workingStorageKey,
      });
      setIntake(buildMascotTransformIntake({ targetType, document: doc, sourceType, originalFilename: file.name }));
    } catch (uploadError) {
      traceEditorUploadFailure({
        step: "uploadCompleted",
        source: "editor-mascot-transformation-wizard.handleUpload",
        error: uploadError,
      });
      setError(
        formatEditorUploadFailureUiMessage({
          failureStep: "uploadCompleted",
          failureMessage: uploadError instanceof Error ? uploadError.message : "unknown_error",
          productionMessage: t("editor.start.uploadFailed"),
        })
      );
    } finally {
      setUploading(false);
    }
  };

  const togglePreserve = (option: MascotTransformPreserveOption) => {
    setPreserve((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  const preparePreviewDocument = useCallback(() => {
    if (!intake) {
      return null;
    }
    try {
      return applyReferenceRoleIntake(intake);
    } catch {
      return null;
    }
  }, [intake]);

  const runRender = async () => {
    if (!intake || !combineIntent || !targetType) {
      return;
    }
    const document = previewDocument ?? preparePreviewDocument();
    if (!document) {
      setError(t("editor.mascotTransform.error.missingUpload" as never));
      return;
    }
    setRenderBusy(true);
    setError("");
    setStep("rendering");
    setRenderProgressStep(0);

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
      const copy = resolveWizardPipelineErrorCopy(outcome);
      setError(t(copy.key as never));
      setStep("summary");
      return;
    }

    setResultUrl(outcome.resultUrl);
    setResultCreditsUsed(outcome.creditsUsed);
    setResultAnalysisReused(outcome.analysisReused);
    setResultDocument(outcome.document);
    setIntake(outcome.intake);
    setStep("result");
  };

  const summaryPrice = useMemo(() => {
    if (!intake) {
      return null;
    }
    return resolveWizardWorkflowPriceFromIntake({
      intake,
      isAdmin: access.billingFree,
    });
  }, [intake, access.billingFree]);

  const goNext = () => {
    if (step === "choose_target") {
      if (!targetType) {
        return;
      }
      setStep("upload");
      return;
    }
    if (step === "upload") {
      if (!intake) {
        return;
      }
      setStep("preserve");
      return;
    }
    if (step === "preserve") {
      setStep("extra_wish");
      return;
    }
    if (step === "extra_wish") {
      const doc = preparePreviewDocument();
      setPreviewDocument(doc);
      setStep("summary");
      return;
    }
    if (step === "summary") {
      void runRender();
    }
  };

  const goBack = () => {
    if (step === "choose_target") {
      onBack();
      return;
    }
    if (step === "upload") {
      setStep("choose_target");
      return;
    }
    if (step === "preserve") {
      setStep("upload");
      return;
    }
    if (step === "extra_wish") {
      setStep("preserve");
      return;
    }
    if (step === "summary") {
      setStep("extra_wish");
    }
  };

  const resetWizard = () => {
    setStep("choose_target");
    setTargetType(initialTarget ?? null);
    setIntake(null);
    setPreviewDocument(null);
    setResultUrl(null);
    setResultDocument(null);
    analysisStartedRef.current.clear();
  };

  return (
    <div data-testid="mascot-transformation-wizard" data-workflow={MASCOT_TRANSFORM_WORKFLOW}>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        {t("editor.mascotTransform.title" as never)}
      </h1>

      {step === "choose_target" ?
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {t("editor.mascotTransform.step.chooseTarget" as never)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MASCOT_TRANSFORM_TARGET_TYPES.map((option) => {
              const selected = targetType === option;
              return (
                <button
                  key={option}
                  type="button"
                  data-target={option}
                  onClick={() => setTargetType(option)}
                  className={`rounded-2xl border p-4 text-left ${studioVisual.editorSurface} ${
                    selected ? "ring-2 ring-[#0067B1]" : ""
                  }`}
                >
                  <span className="font-semibold text-zinc-900">
                    {t(MASCOT_TRANSFORM_TARGET_I18N[option] as never)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      : null}

      {step === "upload" ?
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {t("editor.mascotTransform.step.upload" as never)}
          </h2>
          <div className={`rounded-2xl border border-dashed p-8 text-center ${studioVisual.editorSurface}`}>
            {intake ?
              <p className="text-sm text-zinc-700">{t("editor.mascotTransform.uploadReady" as never)}</p>
            : <>
                <p className="text-sm text-zinc-600">{t("editor.mascotTransform.uploadHint" as never)}</p>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 rounded-xl bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a9a] disabled:opacity-50"
                  data-testid="mascot-transform-upload"
                >
                  {uploading ?
                    t("editor.mascotTransform.uploading" as never)
                  : t("editor.mascotTransform.uploadAction" as never)}
                </button>
              </>
            }
          </div>
          <label className="flex items-center gap-2 text-sm text-white/90">
            <span>{t("editor.mascotTransform.sourceType" as never)}</span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as MascotTransformSourceType)}
              className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white"
              data-testid="mascot-transform-source-type"
            >
              <option value="mascot">{t("editor.mascotTransform.source.mascot" as never)}</option>
              <option value="human">{t("editor.mascotTransform.source.human" as never)}</option>
              <option value="unknown">{t("editor.mascotTransform.source.unknown" as never)}</option>
            </select>
          </label>
        </div>
      : null}

      {step === "preserve" ?
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {t("editor.mascotTransform.step.preserve" as never)}
          </h2>
          <div className={`grid gap-2 sm:grid-cols-2 rounded-2xl border p-4 ${studioVisual.editorSurface}`}>
            {(
              Object.keys(MASCOT_TRANSFORM_PRESERVE_I18N) as MascotTransformPreserveOption[]
            ).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={preserve.includes(option)}
                  onChange={() => togglePreserve(option)}
                  data-preserve={option}
                />
                {t(MASCOT_TRANSFORM_PRESERVE_I18N[option] as never)}
              </label>
            ))}
          </div>
        </div>
      : null}

      {step === "extra_wish" ?
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {t("editor.mascotTransform.step.extraWish" as never)}
          </h2>
          <textarea
            value={userIntent}
            onChange={(e) => setUserIntent(e.target.value)}
            rows={4}
            className={`w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm ${studioVisual.editorSurface}`}
            placeholder={t("editor.mascotTransform.extraWishPlaceholder" as never)}
            data-testid="mascot-transform-user-intent"
          />
        </div>
      : null}

      {step === "summary" && intake && combineIntent && targetType ?
        <div className="mt-6 space-y-4" data-testid="mascot-transform-summary">
          <h2 className="text-lg font-semibold text-white">
            {t("editor.mascotTransform.step.summary" as never)}
          </h2>
          <div className={`space-y-2 rounded-xl border p-4 text-sm ${studioVisual.editorSurface}`}>
            <p className="font-semibold text-zinc-900">
              {t(MASCOT_TRANSFORM_TARGET_I18N[targetType] as never)}
            </p>
            {blueprint && access.billingFree ?
              <p className="text-xs text-zinc-600" data-testid="mascot-transform-blueprint">
                {blueprint.renderInstructions.join(" ")}
              </p>
            : null}
          </div>
          {mascotBrandProtection.active ?
            <EditorBrandProtectionBanner protection={mascotBrandProtection} />
          : null}
          <EditorWizardWorkflowPricingPanel
            intake={intake}
            combineIntent={combineIntent}
            isAdmin={access.billingFree}
          />
          {previewDocument ?
            <EditorFusionWizardAdvancedSettings
              document={previewDocument}
              onDocumentChange={setPreviewDocument}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
            />
          : <HomeCheffOrbitLoader state="preparing_plan" size="md" />}
          {error ?
            <p className="whitespace-pre-wrap text-sm text-red-200">{error}</p>
          : null}
        </div>
      : null}

      {step === "rendering" ?
        <div className="mt-6">
          <EditorFusionWizardProgress activeStepIndex={renderProgressStep} />
        </div>
      : null}

      {step === "result" && resultUrl ?
        <div className="mt-6">
          <EditorFusionWizardResultPanel
            resultUrl={resultUrl}
            creditsUsed={resultCreditsUsed}
            analysisReused={resultAnalysisReused}
            adminFree={access.billingFree}
            onDownload={() => {
              const link = window.document.createElement("a");
              link.href = resultUrl;
              link.download = "mascot-transformation.png";
              link.click();
            }}
            onMakeAnother={resetWizard}
            onOpenEditor={
              onOpenEditor && resultDocument
                ? () => onOpenEditor(resultDocument)
                : undefined
            }
          />
          {!onOpenEditor ?
            <CharacterStudioResultNextSteps
              resultImageUrl={resultUrl}
              sourceImage={resultDocument?.backgroundUrl}
              onMakeAnother={resetWizard}
            />
          : null}
        </div>
      : null}

      {step !== "rendering" && step !== "result" ?
        <EditorFlowActionBar
          onBack={goBack}
          onContinue={goNext}
          continueDisabled={
            (step === "choose_target" && !targetType) ||
            (step === "upload" && !intake) ||
            (step === "summary" && (!previewDocument || renderBusy)) ||
            uploading
          }
          continueLabel={
            step === "summary" && combineIntent && summaryPrice
              ? formatWizardMakeButtonLabel({
                  t,
                  combineIntent,
                  totalCredits: summaryPrice.totalCredits,
                  adminBypass: summaryPrice.adminBypass,
                })
              : step === "summary"
                ? t("editor.mascotTransform.renderAction" as never)
                : t("editor.referenceRole.continue" as never)
          }
          busy={uploading || renderBusy}
        />
      : null}

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
          e.target.value = "";
        }}
      />
    </div>
  );
}
