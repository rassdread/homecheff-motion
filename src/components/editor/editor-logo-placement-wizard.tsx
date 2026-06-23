"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorBrandProtectionBanner } from "@/components/editor/editor-brand-protection-banner";
import { EditorLogoPlacementQuadEditor } from "@/components/editor/editor-logo-placement-quad-editor";
import { EditorVisionTargetHighlight } from "@/components/editor/editor-vision-target-highlight";
import { EditorVisionTargetPickerV2 } from "@/components/editor/editor-vision-target-picker-v2";
import { EditorFlowActionBar } from "@/components/editor/editor-flow-stepper";
import { EditorFusionWizardAdvancedSettings } from "@/components/editor/editor-fusion-wizard-advanced-settings";
import { EditorWizardWorkflowPricingPanel, formatWizardMakeButtonLabel } from "@/components/editor/editor-wizard-workflow-pricing-panel";
import { EditorFusionWizardProgress } from "@/components/editor/editor-fusion-wizard-progress";
import { EditorFusionWizardResultPanel } from "@/components/editor/editor-fusion-wizard-result-panel";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { useEditorUserAccess } from "@/hooks/use-editor-user-access";
import { useActiveTranslator } from "@/i18n/client";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { createEditorDocumentFromUpload, runEditorVisionAndObjectDetection } from "@/lib/editor-canvas-session";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import { patchFusionPlan, createInitialFusionPlan, getFusionPlan } from "@/lib/editor-fusion-plan";
import { resolveWizardPipelineErrorCopy } from "@/lib/wizard-user-copy";
import { resolveWizardWorkflowPriceFromIntake } from "@/lib/wizard-workflow-pricing";
import { runFusionWizardRenderPipeline } from "@/lib/editor-fusion-wizard-render";
import {
  applyReferenceRoleIntake,
  createReferenceIntakeState,
} from "@/lib/editor-reference-role-intake";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";
import {
  collectQueuedReferenceAnalysisJobs,
  markReferenceInstancesAnalysisStatus,
  patchReferenceInstanceAnalysis,
  runReferenceAnalysesInParallel,
} from "@/lib/editor-reference-role-analysis-runner";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  formatEditorUploadFailureUiMessage,
  traceEditorUploadFailure,
} from "@/lib/editor-upload-flow-trace";
import {
  buildLogoPlacementBlueprint,
  buildLogoPlacementFusionPlanPatch,
  logoPlacementRenderInstructions,
  objectSupportsLogoPlacement,
} from "@/lib/logo-placement-blueprint";
import { buildLogoPlacementBlueprintFromVisionTargets } from "@/lib/vision-target-branding-bridge";
import {
  buildVisionTargetSelection,
  buildVisionTargetTreeFromDocument,
  findVisionTargetNode,
  flattenSelectableTargets,
  visionTargetToInstructionObject,
} from "@/lib/vision-target-picker-v2";
import { createBrandReferenceAsset } from "@/lib/editor-instruction-references";
import { CharacterStudioResultNextSteps } from "@/components/character-studio/character-studio-result-next-steps";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type { LogoPlacementBlueprint } from "@/types/brand-asset-protection";

export const LOGO_PLACEMENT_WORKFLOW = "logo_placement" as const;

type WizardStep =
  | "upload"
  | "select_target"
  | "upload_logo"
  | "summary"
  | "rendering"
  | "result";

type Props = {
  initialDocument?: EditorCanvasDocument;
  initialTargetObjectId?: string;
  onBack: () => void;
  onOpenEditor?: (document: EditorCanvasDocument) => void;
};

function resolvePlacementObject(
  doc: EditorCanvasDocument | null | undefined,
  objectId?: string
): EditorInstructionObjectV2 | null {
  if (!doc || !objectId) {
    return null;
  }
  return (
    listInstructionObjectsV2(doc)
      .filter(objectSupportsLogoPlacement)
      .find((object) => object.id === objectId) ?? null
  );
}

export function EditorLogoPlacementWizard({
  initialDocument,
  initialTargetObjectId,
  onBack,
  onOpenEditor,
}: Props) {
  const t = useActiveTranslator();
  const { access } = useEditorUserAccess();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const analysisStartedRef = useRef(new Set<string>());

  const [step, setStep] = useState<WizardStep>(() =>
    initialDocument ? "select_target" : "upload"
  );
  const [document, setDocument] = useState<EditorCanvasDocument | null>(initialDocument ?? null);
  const [intake, setIntake] = useState<EditorReferenceIntakeState | null>(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<EditorInstructionObjectV2 | null>(() =>
    resolvePlacementObject(initialDocument, initialTargetObjectId)
  );
  const [logoUrl, setLogoUrl] = useState("");
  const [logoName, setLogoName] = useState("");
  const [blueprint, setBlueprint] = useState<LogoPlacementBlueprint | null>(null);
  const [uploading, setUploading] = useState(false);
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [previewDocument, setPreviewDocument] = useState<EditorCanvasDocument | null>(null);
  const [renderProgressStep, setRenderProgressStep] = useState(0);
  const [renderBusy, setRenderBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultCreditsUsed, setResultCreditsUsed] = useState(0);
  const [resultAnalysisReused, setResultAnalysisReused] = useState(false);
  const [resultDocument, setResultDocument] = useState<EditorCanvasDocument | null>(null);

  const combineIntent = "product_branding" as const;

  const summaryPrice = useMemo(() => {
    if (!intake) {
      return null;
    }
    return resolveWizardWorkflowPriceFromIntake({
      intake,
      isAdmin: access.billingFree,
    });
  }, [intake, access.billingFree]);

  const placementObjects = useMemo(() => {
    if (!document) {
      return [];
    }
    return listInstructionObjectsV2(document).filter(objectSupportsLogoPlacement);
  }, [document]);

  const visionTargetTree = useMemo(() => {
    if (!document) {
      return null;
    }
    return buildVisionTargetTreeFromDocument(document);
  }, [document]);

  const visionSelectableTargets = useMemo(() => {
    if (!visionTargetTree) {
      return [];
    }
    return flattenSelectableTargets(visionTargetTree.roots);
  }, [visionTargetTree]);

  const useVisionTargetPicker = visionSelectableTargets.length > 0;

  const hoveredVisionNode = useMemo(() => {
    if (!document || !visionTargetTree || !hoveredTargetId) {
      return null;
    }
    return findVisionTargetNode(visionTargetTree.roots, hoveredTargetId);
  }, [document, visionTargetTree, hoveredTargetId]);

  const selectedVisionNodes = useMemo(() => {
    if (!document || !visionTargetTree) {
      return [];
    }
    return selectedTargetIds
      .map((id) => findVisionTargetNode(visionTargetTree.roots, id))
      .filter((node): node is NonNullable<typeof node> => node !== null);
  }, [document, visionTargetTree, selectedTargetIds]);

  useEffect(() => {
    if (!document || !useVisionTargetPicker) {
      return;
    }
    if (selectedTargetIds.length === 0 && initialTargetObjectId && visionTargetTree) {
      const match = visionSelectableTargets.find(
        (node) => node.objectId === initialTargetObjectId || node.id === initialTargetObjectId
      );
      if (match) {
        queueMicrotask(() => setSelectedTargetIds([match.id]));
      }
    }
  }, [document, initialTargetObjectId, selectedTargetIds.length, useVisionTargetPicker, visionSelectableTargets, visionTargetTree]);

  useEffect(() => {
    if (!document) {
      return;
    }
    if (useVisionTargetPicker && selectedTargetIds.length > 0 && visionTargetTree) {
      const selection = buildVisionTargetSelection(document, selectedTargetIds, visionTargetTree.roots);
      const primary = selection.primary;
      if (primary) {
        queueMicrotask(() => setSelectedObject(visionTargetToInstructionObject(document, primary)));
      }
      return;
    }
    if (!useVisionTargetPicker && selectedObject) {
      return;
    }
  }, [document, selectedTargetIds, useVisionTargetPicker, visionTargetTree]);

  const brandProtection = useMemo(() => {
    if (!blueprint) {
      return null;
    }
    return buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoAssets: [{ referenceId: "uploaded_logo", url: blueprint.logoAssetUrl, name: logoName || "Logo" }],
      logoPlacement: blueprint,
      userPreserveLogoExact: blueprint.preserveLogoExact,
    });
  }, [blueprint, logoName]);

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
        useFusionIntelligence: true,
        fusionWizardBasicOnly: true,
        isAdmin: access.billingFree,
        creditsAvailable: access.credits,
      }
    );
  }, [intake?.slots, access.billingFree, access.credits]);

  const bootstrapIntake = useCallback((doc: EditorCanvasDocument) => {
    const config = workflowReferenceConfigForIntent(combineIntent);
    const base = createReferenceIntakeState({ config });
    const productRoleId = config.requiredRoles[0] ?? config.roles[0]?.id;
    if (!productRoleId) {
      setIntake(base);
      return;
    }
    const instanceId = `logo_product_${Date.now()}`;
    setIntake({
      ...base,
      slots: base.slots.map((slot) => {
        if (slot.roleId !== productRoleId) {
          return slot;
        }
        return {
          ...slot,
          instances: [
            {
              instanceId,
              document: doc,
              analysis: { status: "queued" as const },
              metadata: { role: slot.role },
            },
          ],
        };
      }),
    });
  }, []);

  const handleSourceUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const doc = createEditorDocumentFromUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        backgroundUrl: uploaded.workingImageUrl,
        backgroundStorageKey: uploaded.workingStorageKey,
      });
      setVisionAnalyzing(true);
      const analyzed = await runEditorVisionAndObjectDetection(doc, {
        trigger: "logo-placement-wizard-upload",
        analysisDepth: "basic",
      });
      setDocument(analyzed);
      bootstrapIntake(analyzed);
      const initialTarget = resolvePlacementObject(analyzed, initialTargetObjectId);
      if (initialTarget) {
        setSelectedObject(initialTarget);
      }
      setStep("select_target");
    } catch (uploadError) {
      traceEditorUploadFailure({
        step: "uploadCompleted",
        source: "editor-logo-placement-wizard.handleSourceUpload",
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
      setVisionAnalyzing(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!selectedObject || !document) {
      return;
    }
    setUploadingLogo(true);
    setError("");
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const asset = createBrandReferenceAsset({
        name: file.name.replace(/\.[^.]+$/, "") || "Logo",
        url: uploaded.workingImageUrl,
      });
      setLogoUrl(asset.url);
      setLogoName(asset.name);
      const selection =
        useVisionTargetPicker && visionTargetTree
          ? buildVisionTargetSelection(document, selectedTargetIds, visionTargetTree.roots)
          : null;
      const nextBlueprint =
        selection?.primary
          ? buildLogoPlacementBlueprintFromVisionTargets({
              document,
              selection,
              logoAssetUrl: asset.url,
              preserveLogoExact: true,
            })
          : buildLogoPlacementBlueprint({
              targetObject: {
                ...selectedObject,
                bounds: resolveInstructionObjectBounds(selectedObject, document),
              },
              logoAssetUrl: asset.url,
              preserveLogoExact: true,
              document,
            });
      if (!nextBlueprint) {
        throw new Error("Logo placement blueprint could not be built.");
      }
      setBlueprint(nextBlueprint);
      const patchedDocument = document
        ? {
            ...document,
            instructionStudioState: {
              ...document.instructionStudioState,
              logoPlacementBlueprint: nextBlueprint,
              brandReferences: [
                ...(document.instructionStudioState?.brandReferences ?? []),
                asset,
              ],
            },
            updatedAt: new Date().toISOString(),
          }
        : null;
      if (patchedDocument) {
        setDocument(patchedDocument);
      }
      if (intake && patchedDocument) {
        try {
          const applied = applyReferenceRoleIntake(intake);
          const planPatch = buildLogoPlacementFusionPlanPatch(nextBlueprint);
          let plan = getFusionPlan(applied) ?? createInitialFusionPlan(applied, combineIntent);
          plan = {
            ...plan,
            intent: combineIntent,
            references: planPatch.references ?? plan.references,
            brandRules: planPatch.brandRules ?? plan.brandRules,
            generationSettings: {
              ...plan.generationSettings,
              ...planPatch.generationSettings,
            },
            userInstructions: logoPlacementRenderInstructions(nextBlueprint).join(" "),
          };
          const withPlan = patchFusionPlan(applied, plan);
          setPreviewDocument({
            ...withPlan,
            instructionStudioState: {
              ...withPlan.instructionStudioState,
              combineIntent,
              logoPlacementBlueprint: nextBlueprint,
            },
          });
        } catch {
          setPreviewDocument(null);
        }
      }
      setStep("summary");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Logo upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const preparePreviewDocument = useCallback(() => {
    if (!intake || !document || !blueprint) {
      return null;
    }
    try {
      const applied = applyReferenceRoleIntake(intake);
      const planPatch = buildLogoPlacementFusionPlanPatch(blueprint);
      let plan = getFusionPlan(applied) ?? createInitialFusionPlan(applied, combineIntent);
      plan = {
        ...plan,
        intent: combineIntent,
        references: planPatch.references ?? plan.references,
        brandRules: planPatch.brandRules ?? plan.brandRules,
        generationSettings: {
          ...plan.generationSettings,
          ...planPatch.generationSettings,
        },
        userInstructions: logoPlacementRenderInstructions(blueprint).join(" "),
      };
      const withPlan = patchFusionPlan(applied, plan);
      return {
        ...withPlan,
        instructionStudioState: {
          ...withPlan.instructionStudioState,
          combineIntent,
          logoPlacementBlueprint: blueprint,
        },
      };
    } catch {
      return null;
    }
  }, [intake, document, blueprint]);

  const runRender = async () => {
    if (!intake || !blueprint) {
      return;
    }
    const doc = previewDocument ?? preparePreviewDocument();
    if (!doc) {
      setError(t("editor.logoPlacement.error.missingSetup" as never));
      return;
    }
    setRenderBusy(true);
    setError("");
    setStep("rendering");
    setRenderProgressStep(0);

    const outcome = await runFusionWizardRenderPipeline({
      intake,
      document: doc,
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

  const goBack = () => {
    if (step === "upload") {
      onBack();
      return;
    }
    if (step === "select_target") {
      setStep("upload");
      return;
    }
    if (step === "upload_logo") {
      setStep("select_target");
      return;
    }
    if (step === "summary") {
      setStep("upload_logo");
      return;
    }
    onBack();
  };

  const goNext = () => {
    if (step === "upload") {
      fileRef.current?.click();
      return;
    }
    if (step === "select_target" && (selectedObject || selectedTargetIds.length > 0)) {
      setStep("upload_logo");
      return;
    }
    if (step === "upload_logo") {
      logoFileRef.current?.click();
      return;
    }
    if (step === "summary") {
      void runRender();
    }
  };

  return (
    <div data-workflow="logo_placement" data-testid="logo-placement-wizard">
      <h1 className="text-xl font-semibold text-white">
        {t("editor.logoPlacement.title" as never)}
      </h1>
      <p className="mt-1 text-sm text-white/80">
        {t("editor.logoPlacement.subtitle" as never)}
      </p>

      {brandProtection ?
        <div className="mt-4">
          <EditorBrandProtectionBanner protection={brandProtection} />
        </div>
      : null}

      {step === "upload" ?
        <div className="mt-6 space-y-3">
          <p className="text-sm text-white/90">{t("editor.logoPlacement.uploadSource" as never)}</p>
          <button
            type="button"
            disabled={uploading || visionAnalyzing}
            onClick={() => fileRef.current?.click()}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${studioVisual.editorSurface}`}
          >
            {uploading || visionAnalyzing
              ? t("editor.start.uploading" as never)
              : t("editor.logoPlacement.uploadSourceAction" as never)}
          </button>
        </div>
      : null}

      {visionAnalyzing ?
        <div className="mt-4">
          <HomeCheffOrbitLoader state="analyzing" size="md" />
        </div>
      : null}

      {step === "select_target" && document ?
        <div className="mt-6 space-y-4" data-testid="logo-placement-targets">
          <p className="text-sm text-white/90">{t("editor.logoPlacement.selectTarget" as never)}</p>
          {document.backgroundUrl ?
            <EditorVisionTargetHighlight
              document={document}
              imageUrl={document.backgroundUrl}
              hoveredNode={hoveredVisionNode}
              selectedNodes={selectedVisionNodes}
            />
          : null}
          {useVisionTargetPicker ?
            <EditorVisionTargetPickerV2
              document={document}
              selectedTargetIds={selectedTargetIds}
              onSelectionChange={setSelectedTargetIds}
              onHoverTargetId={setHoveredTargetId}
              multiSelect
              showAuditDebug={access.billingFree}
            />
          : placementObjects.length === 0 ?
            <p className="text-sm text-amber-100">{t("editor.logoPlacement.noTargets" as never)}</p>
          : (
            <div className="grid gap-2 sm:grid-cols-2">
              {placementObjects.map((obj) => (
                <button
                  key={obj.id}
                  type="button"
                  data-testid={`logo-placement-target-${obj.id}`}
                  data-selected={selectedObject?.id === obj.id ? "true" : "false"}
                  onClick={() => setSelectedObject(obj)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm ${
                    selectedObject?.id === obj.id
                      ? "border-[#0067B1] bg-white ring-2 ring-[#0067B1]/30"
                      : "border-white/20 bg-white/95"
                  }`}
                >
                  <span className="font-semibold text-zinc-900">{obj.label}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{obj.category}</span>
                </button>
              ))}
            </div>
          )}
          {selectedObject ?
            <p className="text-xs text-emerald-100">
              {t("editor.logoPlacement.placeHere" as never)}: {selectedObject.label}
              {selectedVisionNodes.length > 1
                ? ` (+${selectedVisionNodes.length - 1} extra)`
                : ""}
            </p>
          : null}
        </div>
      : null}

      {step === "upload_logo" && selectedObject ?
        <div className="mt-6 space-y-3">
          <p className="text-sm text-white/90">
            {t("editor.logoPlacement.uploadLogo" as never)} — {selectedObject.label}
          </p>
          <ul className="text-xs text-white/75">
            <li>{t("editor.logoPlacement.option.fit" as never)}</li>
            <li>{t("editor.logoPlacement.option.perspective" as never)}</li>
            <li>{t("editor.logoPlacement.option.shadow" as never)}</li>
            <li>{t("editor.logoPlacement.option.exact" as never)}</li>
          </ul>
          <button
            type="button"
            disabled={uploadingLogo}
            onClick={() => logoFileRef.current?.click()}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${studioVisual.editorSurface}`}
            data-testid="logo-placement-upload-logo"
          >
            {uploadingLogo
              ? t("editor.start.uploading" as never)
              : t("editor.logoPlacement.uploadLogoAction" as never)}
          </button>
        </div>
      : null}

      {step === "summary" ?
        <div className="mt-6 space-y-4" data-testid="logo-placement-summary">
          {intake ?
            <EditorWizardWorkflowPricingPanel
              intake={intake}
              combineIntent={combineIntent}
              isAdmin={access.billingFree}
            />
          : null}
          {previewDocument ?
            <EditorFusionWizardAdvancedSettings
              document={previewDocument}
              onDocumentChange={setPreviewDocument}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
            />
          : <HomeCheffOrbitLoader state="preparing_plan" size="md" />}
          {logoUrl && access.billingFree ?
            <p className="text-xs text-white/80" data-testid="logo-placement-logo-url">
              {logoName}: {logoUrl}
            </p>
          : logoName ?
            <p className="text-xs text-white/80" data-testid="logo-placement-logo-name">
              {logoName}
            </p>
          : null}
          {blueprint && document?.backgroundUrl && blueprint.quad ?
            <EditorLogoPlacementQuadEditor
              imageUrl={document.backgroundUrl}
              bounds={blueprint.targetBounds}
              quad={blueprint.quad}
              objectLabel={blueprint.targetLabel}
              objectCategory={selectedObject?.category}
              onQuadChange={(quad) => {
                const updatedBlueprint = {
                  ...blueprint,
                  quad,
                  placementMode: "perspective_warp" as const,
                  quadSource: "user" as const,
                };
                setBlueprint(updatedBlueprint);
                setPreviewDocument((prev) =>
                  prev
                    ? {
                        ...prev,
                        instructionStudioState: {
                          ...prev.instructionStudioState,
                          logoPlacementBlueprint: updatedBlueprint,
                        },
                      }
                    : prev
                );
              }}
            />
          : null}
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
              link.download = "logo-placement.png";
              link.click();
            }}
            onMakeAnother={() => {
              setStep("select_target");
              setResultUrl(null);
              setBlueprint(null);
              setLogoUrl("");
            }}
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
              onMakeAnother={() => {
                setStep("select_target");
                setResultUrl(null);
                setBlueprint(null);
                setLogoUrl("");
              }}
            />
          : null}
        </div>
      : null}

      {step !== "rendering" && step !== "result" ?
        <EditorFlowActionBar
          onBack={goBack}
          onContinue={goNext}
          continueDisabled={
            (step === "select_target" && !selectedObject) ||
            (step === "summary" && (!previewDocument || renderBusy)) ||
            uploading ||
            uploadingLogo ||
            visionAnalyzing
          }
          continueLabel={
            step === "summary" && summaryPrice
              ? formatWizardMakeButtonLabel({
                  t,
                  combineIntent,
                  totalCredits: summaryPrice.totalCredits,
                  adminBypass: summaryPrice.adminBypass,
                })
              : step === "summary"
                ? t("editor.logoPlacement.renderAction" as never)
                : step === "upload_logo"
                  ? t("editor.logoPlacement.uploadLogoAction" as never)
                  : t("editor.referenceRole.continue" as never)
          }
          busy={uploading || uploadingLogo || renderBusy}
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
            void handleSourceUpload(file);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={logoFileRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleLogoUpload(file);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
