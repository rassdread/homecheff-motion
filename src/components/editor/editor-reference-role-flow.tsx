"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { EditorFlowActionBar, EditorFlowStepper } from "@/components/editor/editor-flow-stepper";
import { EditorUploadClassifyGate } from "@/components/editor/editor-upload-classify-gate";
import { EditorGenerationCostPanel } from "@/components/editor/editor-generation-cost-panel";
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
  assetPickerSelectionToDerivationSource,
  createEditorDocumentFromLibrarySource,
  createEditorDocumentFromUpload,
} from "@/lib/editor-canvas-session";
import { startScreenPhaseToFlowStep } from "@/lib/editor-flow-steps";
import {
  createIdleReferenceAnalysis,
  runLiveReferenceRoleAnalysis,
} from "@/lib/editor-reference-role-analysis";
import {
  applyReferenceRoleIntake,
  createReferenceIntakeState,
  referenceIntakeCostOptions,
  referenceIntakeReady,
} from "@/lib/editor-reference-role-intake";
import { combineIntentOption } from "@/lib/editor-workflow-product";
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

type FlowStep = "reference_roles" | "classify" | "output_type" | "motion_upsell" | "plan_review";

type Props = {
  config: EditorWorkflowReferenceConfig;
  combineIntent?: EditorFusionIntent;
  busy?: boolean;
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
  busy,
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

  const activeFlowStep = startScreenPhaseToFlowStep({
    kind: "reference_flow",
    referenceStep:
      step === "plan_review"
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
  const costWorkflow = combineIntent ?? config.intent ?? "custom_composition";
  const rolesReady = referenceIntakeReady(intake);
  const showOutputStep = config.supportsVariations || config.supportsSequences;
  const showMotionStep =
    intake.output.outputMode === "sequence" && config.supportsMotionHandoff;

  const analysisRunning = intake.slots.some((slot) =>
    slot.instances.some((i) => i.analysis.status === "running" || i.analysis.status === "uploading")
  );

  const previewDocument = useMemo(() => {
    if (step !== "plan_review" || !rolesReady) {
      return null;
    }
    try {
      return applyReferenceRoleIntake(intake);
    } catch {
      return null;
    }
  }, [intake, rolesReady, step]);

  const analyzeInstance = useCallback(
    async (roleSpec: EditorReferenceRoleSpec, instance: EditorReferenceRoleInstance) => {
      setIntake((prev) => ({
        ...prev,
        slots: prev.slots.map((slot) =>
          slot.roleId === roleSpec.id
            ? {
                ...slot,
                instances: slot.instances.map((item) =>
                  item.instanceId === instance.instanceId
                    ? { ...item, analysis: { status: "running" } }
                    : item
                ),
              }
            : slot
        ),
      }));

      const analysis = await runLiveReferenceRoleAnalysis(instance.document, roleSpec);
      setIntake((prev) => ({
        ...prev,
        slots: prev.slots.map((slot) =>
          slot.roleId === roleSpec.id
            ? {
                ...slot,
                instances: slot.instances.map((item) =>
                  item.instanceId === instance.instanceId ? { ...item, analysis } : item
                ),
              }
            : slot
        ),
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
        analysis: createIdleReferenceAnalysis(),
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

      void analyzeInstance(roleSpec, instance);
    },
    [analyzeInstance, config.roles]
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
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const doc = createEditorDocumentFromUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        backgroundUrl: uploaded.workingImageUrl,
        backgroundStorageKey: uploaded.workingStorageKey,
      });
      addDocumentToRole(roleId, doc, file.name);
    } catch {
      setError(t("editor.start.uploadFailed"));
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
      if (!rolesReady || analysisRunning) {
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
      setStep("plan_review");
      return;
    }
    if (step === "output_type") {
      if (showMotionStep) {
        setStep("motion_upsell");
        return;
      }
      setStep("plan_review");
      return;
    }
    if (step === "motion_upsell") {
      setStep("plan_review");
      return;
    }
    onComplete(applyReferenceRoleIntake(intake));
  };

  const goBack = () => {
    if (step === "plan_review") {
      if (showMotionStep && intake.output.outputMode === "sequence") {
        setStep("motion_upsell");
        return;
      }
      if (showOutputStep) {
        setStep("output_type");
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

      {(busy || uploadingRoleId) && step === "reference_roles" ?
        <div className="mt-6 flex justify-center py-6">
          <HomeCheffOrbitLoader state="analyzing" size="md" />
        </div>
      : null}

      {step === "reference_roles" ?
        <>
          <div className="mt-6 space-y-4">{config.roles.map(renderRoleSection)}</div>
          {error ?
            <p className="mt-4 text-sm text-red-200">{error}</p>
          : null}
          {analysisRunning ?
            <p className="mt-2 text-xs text-white/80">{t("editor.referenceRole.analysis.running" as never)}</p>
          : null}
        </>
      : null}

      {step === "output_type" ? renderOutputType() : null}
      {step === "motion_upsell" ? renderMotionUpsell() : null}

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

      {step === "plan_review" ?
        <div className="mt-6 space-y-4" data-testid="reference-plan-review">
          {previewDocument ?
            <EditorPlanSummaryPanel document={previewDocument} />
          : <HomeCheffOrbitLoader state="preparing_plan" size="md" />}
        </div>
      : null}

      <EditorFlowActionBar
        onBack={goBack}
        onClose={onClose ?? onBack}
        onContinue={goNext}
        continueDisabled={
          (step === "reference_roles" && (!rolesReady || analysisRunning)) ||
          (step === "classify" && false) ||
          (step === "plan_review" && !previewDocument)
        }
        continueLabel={
          step === "plan_review"
            ? t("editor.referenceRole.openEditor" as never)
            : t("editor.referenceRole.continue" as never)
        }
        busy={busy || Boolean(uploadingRoleId)}
      />

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
