"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import {
  ensureCompositionPlan,
  getCompositionPlan,
  patchCompositionPlan,
  resolveCompositionBaseImageUrl,
} from "@/lib/editor-composition-plan";
import { buildEditorCompositionPrompt } from "@/lib/editor-composition-prompt-builder";
import { EditorFusionSetupPanel } from "@/components/editor/editor-fusion-setup-panel";
import { EditorFusionLifeTimelinePanel } from "@/components/editor/editor-fusion-life-timeline-panel";
import { EditorTransformationSessionPanel } from "@/components/editor/editor-transformation-session-panel";
import { EditorFusionReferenceStrip } from "@/components/editor/editor-fusion-reference-strip";
import { EditorPlanSummaryPanel } from "@/components/editor/editor-plan-summary-panel";
import { EditorFusionCategoryWorkspace } from "@/components/editor/editor-fusion-category-workspace";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { EditorFlowStepper } from "@/components/editor/editor-flow-stepper";
import { EditorPostGenerationActionCenter } from "@/components/editor/editor-post-generation-action-center";
import {
  patchDocumentGenerationPackage,
  syncTransformationSessionFromVariants,
} from "@/lib/editor-generation-package";
import { collectEditorMetadataPipeline, metadataEnrichedGenerationPrompt } from "@/lib/editor-metadata-pipeline";
import { useEditorUserAccess } from "@/hooks/use-editor-user-access";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import { fusionPlanCostOptions } from "@/lib/editor-fusion-generation-settings";
import {
  checkGenerationAccess,
  createAccountingRecord,
  deductCreditsAfterSuccess,
  persistUserCredits,
  recordGenerationAccounting,
} from "@/lib/editor-generation-gate";
import { buildTransformationStepPrompt } from "@/lib/editor-transformation-session";
import { ensureFusionPlan } from "@/lib/editor-fusion-plan";
import { combineIntentOption } from "@/lib/editor-workflow-product";
import { mergeInstructionSelection } from "@/lib/editor-instruction-studio";
import { executeEditorInstructionVariantApi, recordEditorVariantPreflightBlock } from "@/lib/editor-instruction-variant-client";
import {
  logEditorVariantPreflightDev,
  preflightEditorInstructionVariant,
  variantValidationMessageKey,
} from "@/lib/editor-instruction-variant-preflight";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  instructionVariantWithStatus,
  patchInstructionVariant,
} from "@/lib/editor-instruction-version";
import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { resolveCompositionBrandIdentity } from "@/lib/editor-personalized-recommendations";
import {
  enableAdvancedFusionCompose,
  shouldOfferAdvancedFusionCompose,
} from "@/lib/editor-fusion-advanced";
import { studioVisual } from "@/lib/studio-visual-tokens";

const COMBINE_WORKSPACE_COMPONENT = "EditorCombineWorkspace";

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSave?: () => void;
};

export function EditorCombineWorkspace({
  document,
  busy = false,
  onDocumentChange,
  onSave,
}: Props) {
  const t = useActiveTranslator();
  const { access, setCredits } = useEditorUserAccess();
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastAccessPath, setLastAccessPath] = useState<
    "free" | "ad" | "credits" | "subscription" | "premium" | undefined
  >();

  const plan = useMemo(() => {
    const withPlan = ensureCompositionPlan(document);
    return getCompositionPlan(withPlan) ?? withPlan.instructionStudioState!.compositionPlan!;
  }, [document]);

  const base = resolveCompositionBaseImageUrl(document);
  const approved = activeApprovedVariant(document);

  const handleGenerate = async () => {
    const fusionPlan = document.instructionStudioState?.fusionPlan;
    const hasFusionReady = Boolean(
      fusionPlan && (fusionPlan.references.length > 0 || plan.references.length > 0 || fusionPlan.intent)
    );
    if (plan.items.length === 0 && !fusionPlan?.userInstructions && !hasFusionReady) {
      setStatusMessage(t("editor.combine.planEmpty" as never));
      return;
    }

    const workflow = fusionPlan?.intent ?? "custom_composition";
    const costOptions = fusionPlan ? fusionPlanCostOptions(fusionPlan, document) : {};
    const accessDecision = checkGenerationAccess({
      user: access,
      workflow,
      options: costOptions,
      useCredits: true,
    });
    if (!accessDecision.allowed) {
      setStatusMessage(t(accessDecision.disclosureKey as never, accessDecision.disclosureParams as never));
      return;
    }

    const transformationSession = document.instructionStudioState?.transformationSession;
    const isSequence = costOptions.outputMode === "sequence" && transformationSession;

    setGenerating(true);
    const recCtx = buildEditorRecommendationContext({ document });

    const runSingleGeneration = async (
      prompt: string,
      variantLabel: string,
      triggerSource: "combine_generate" | "combine_sequence_step"
    ) => {
      const selection = mergeInstructionSelection(document, undefined, {
        objectKey: "combine",
        objectLabel: "Combined composition",
        category: "other",
        action: "replace",
        customPrompt: fusionPlan?.userInstructions,
      });
      const audit = preflightEditorInstructionVariant({
        triggerSource,
        sessionId: document.sessionId,
        imageUrl: base.url,
        prompt,
        instruction: selection,
        document,
      });
      logEditorVariantPreflightDev(audit);
      if (!audit.validation.ok) {
        const messageKey = variantValidationMessageKey(audit.validation);
        if (messageKey) {
          setStatusMessage(t(messageKey as never));
        }
        recordEditorVariantPreflightBlock({
          triggerSource,
          sessionId: document.sessionId,
          route: "/api/editor/instruction/variant",
          trace: {
            componentName: COMBINE_WORKSPACE_COMPONENT,
            buttonName:
              triggerSource === "combine_sequence_step"
                ? "combine-sequence-step-generate"
                : "combine-generate-button",
          },
          validationCode: audit.validation.code,
        });
        return { ok: false as const, nextDoc: document };
      }

      let nextDoc = appendInstructionVariant(
        document,
        createPendingInstructionVariant({
          sourceImageUrl: base.url,
          sourceImageId: base.variantId ?? "background",
          instruction: selection,
          prompt,
          variantType: "combined",
          compositionPlanId: plan.id,
          referenceIds: plan.references.map((r) => r.id),
          parentVariantId: approved?.id ?? null,
          name: variantLabel,
        })
      );
      onDocumentChange(nextDoc);
      const pendingId = nextDoc.instructionStudioState?.previewVariantId;
      if (!pendingId) {
        return { ok: false as const, nextDoc };
      }
      nextDoc = patchInstructionVariant(
        nextDoc,
        pendingId,
        instructionVariantWithStatus(
          nextDoc.instructionVariants!.find((v) => v.id === pendingId)!,
          "running"
        )
      );
      onDocumentChange(nextDoc);

      const result = await executeEditorInstructionVariantApi({
        sessionId: document.sessionId,
        imageUrl: base.url,
        prompt,
        instruction: selection,
        variantName: variantLabel,
        parentVariantId: approved?.id ?? null,
        document,
        triggerSource,
        trace: {
          componentName: COMBINE_WORKSPACE_COMPONENT,
          buttonName:
            triggerSource === "combine_sequence_step"
              ? "combine-sequence-step-generate"
              : "combine-generate-button",
        },
      });

      if (result.ok && result.resultUrl) {
        nextDoc = patchInstructionVariant(
          nextDoc,
          pendingId,
          instructionVariantWithStatus(
            nextDoc.instructionVariants!.find((v) => v.id === pendingId)!,
            "completed",
            {
              resultUrl: result.resultUrl,
              resultStorageKey: result.storageKey,
              provider: result.provider,
              model: result.model,
            }
          )
        );
        return { ok: true as const, nextDoc };
      }

      nextDoc = patchInstructionVariant(
        nextDoc,
        pendingId,
        instructionVariantWithStatus(
          nextDoc.instructionVariants!.find((v) => v.id === pendingId)!,
          "failed",
          { error: result.error }
        )
      );
      return { ok: false as const, nextDoc };
    };

    let successfulOutputs = 0;
    let failedOutputs = 0;
    let latestDoc = document;
    const referenceAssignments = document.instructionStudioState?.referenceIntake?.roleAssignments?.filter(
      (assignment): assignment is EditorReferenceAssignment =>
        Boolean(assignment.url && assignment.instanceId && assignment.name)
    );
    const metadataPipeline = collectEditorMetadataPipeline(document);

    if (isSequence && transformationSession) {
      for (const step of transformationSession.steps) {
        const stepPrompt = metadataEnrichedGenerationPrompt(
          buildTransformationStepPrompt({
            session: transformationSession,
            step,
            userInstruction: fusionPlan?.userInstructions,
            referenceAssignments,
          }),
          document
        );
        const outcome = await runSingleGeneration(
          stepPrompt,
          `${t("editor.combine.variantName" as never)} ${step.index + 1}/${transformationSession.stepCount}`,
          "combine_sequence_step"
        );
        latestDoc = outcome.nextDoc;
        if (outcome.ok) {
          successfulOutputs += 1;
        } else {
          failedOutputs += 1;
        }
      }
    } else {
      const prompt = metadataEnrichedGenerationPrompt(
        fusionPlan
          ? buildEditorFusionPrompt({
              plan: fusionPlan,
              brandIdentity: resolveCompositionBrandIdentity(recCtx),
              preserveStyle: document.instructionStudioState?.selection?.sliders?.preserveStyle,
              preserveBrand: document.instructionStudioState?.selection?.sliders?.brandPreservation,
              referenceAssignments,
            })
          : buildEditorCompositionPrompt({
              plan,
              brandIdentity: resolveCompositionBrandIdentity(recCtx),
              preserveStyle: document.instructionStudioState?.selection?.sliders?.preserveStyle,
              preserveBrand: document.instructionStudioState?.selection?.sliders?.brandPreservation,
            }),
        document
      );
      const outcome = await runSingleGeneration(
        prompt,
        t("editor.combine.variantName" as never),
        "combine_generate"
      );
      latestDoc = outcome.nextDoc;
      if (outcome.ok) {
        successfulOutputs = 1;
      } else {
        failedOutputs = 1;
      }
    }

    const accounting = createAccountingRecord({
      workflow,
      cost: accessDecision.cost,
      successfulOutputs,
      failedOutputs,
      accessPath: accessDecision.accessPath ?? "credits",
      user: access,
    });
    recordGenerationAccounting(accounting);
    const updatedAccess = deductCreditsAfterSuccess(access, accounting.creditsCharged);
    setCredits(updatedAccess.credits);
    persistUserCredits(updatedAccess);
    setLastAccessPath(accessDecision.accessPath);

    latestDoc = syncTransformationSessionFromVariants(latestDoc);
    latestDoc = patchDocumentGenerationPackage(latestDoc);
    if (metadataPipeline.motionQueryParams.referenceMetadata) {
      latestDoc = {
        ...latestDoc,
        instructionStudioState: {
          ...latestDoc.instructionStudioState,
          referenceIntake: {
            ...latestDoc.instructionStudioState?.referenceIntake,
            motionMetadata: metadataPipeline.motionQueryParams,
          },
        },
      };
    }

    onDocumentChange(latestDoc);
    setStatusMessage(
      successfulOutputs > 0
        ? t("editor.combine.generateSuccess" as never)
        : t("editor.combine.generateFailed" as never)
    );
    setGenerating(false);
  };

  const combineIntent = document.instructionStudioState?.combineIntent;

  useEffect(() => {
    if (document.editorFlowMode === "combine" && !document.instructionStudioState?.fusionPlan) {
      onDocumentChange(ensureFusionPlan(document));
    }
  }, [document, onDocumentChange]);

  return (
    <div className="space-y-4">
      <EditorFlowStepper activeStep={generating ? "generate" : "plan"} compact />

      <EditorFusionReferenceStrip document={document} />

      {combineIntent ?
        <div
          className={`rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-4 py-3 text-sm text-zinc-800 ${studioVisual.editorSurface}`}
          data-testid="combine-intent-banner"
        >
          <p className="font-semibold text-zinc-900">
            {t(combineIntentOption(combineIntent).labelKey as never)}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {t(combineIntentOption(combineIntent).hintKey as never)}
          </p>
        </div>
      : null}

      <EditorFusionCategoryWorkspace
        document={document}
        settings={
          <>
            <EditorFusionSetupPanel document={document} onDocumentChange={onDocumentChange} />
            <EditorFusionLifeTimelinePanel document={document} onDocumentChange={onDocumentChange} />
            <EditorTransformationSessionPanel document={document} onDocumentChange={onDocumentChange} />
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating || busy}
              onClick={() => void handleGenerate()}
              className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${studioVisual.btnGradientPrimary}`}
              data-testid="combine-generate-button"
            >
              {generating ?
                t("editor.combine.generating" as never)
              : t("editor.combine.generate" as never)}
            </button>
            {onSave ?
              <button
                type="button"
                onClick={() => {
                  onDocumentChange(patchCompositionPlan(document, plan));
                  onSave();
                  setStatusMessage(t("editor.combine.planSaved" as never));
                }}
                className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800"
              >
                {t("editor.combine.savePlan" as never)}
              </button>
            : null}
          </div>
        }
      />

      <EditorPlanSummaryPanel document={document} />

      {shouldOfferAdvancedFusionCompose(document) ?
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
          <p className="font-semibold text-zinc-900">{t("editor.fusion.advancedCompose" as never)}</p>
          <p className="mt-1 text-xs text-zinc-600">{t("editor.fusion.advancedComposeHint" as never)}</p>
          <button
            type="button"
            className="mt-3 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800"
            data-testid="fusion-advanced-compose-button"
            onClick={() => onDocumentChange(enableAdvancedFusionCompose(document))}
          >
            {t("editor.fusion.advancedCompose" as never)}
          </button>
        </div>
      : null}

      {generating ?
        <div className="flex justify-center py-8">
          <HomeCheffOrbitLoader state="generating" size="lg" />
        </div>
      : null}

      {statusMessage ?
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {statusMessage}
        </p>
      : null}

      {!generating && (document.instructionStudioState?.generationPackage?.generatedImages.length ?? 0) > 0 ?
        <EditorPostGenerationActionCenter
          document={document}
          resultType={
            document.instructionStudioState?.referenceIntake?.outputMode === "sequence"
              ? "sequence"
              : "image"
          }
          lastAccessPath={lastAccessPath}
        />
      : null}
    </div>
  );
}
