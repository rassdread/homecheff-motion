"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import {
  addCompositionReference,
  analyzeCompositionReference,
  appendCompositionPlanItem,
  buildCompositionPlanItem,
  ensureCompositionPlan,
  getCompositionPlan,
  patchCompositionPlan,
  reanalyzeCompositionReference,
  removeCompositionPlanItem,
  removeCompositionReference,
  resolveCompositionBaseImageUrl,
} from "@/lib/editor-composition-plan";
import { buildEditorCompositionPrompt } from "@/lib/editor-composition-prompt-builder";
import { EditorFusionPlanPanel } from "@/components/editor/editor-fusion-plan-panel";
import { EditorFusionSetupPanel } from "@/components/editor/editor-fusion-setup-panel";
import { EditorGenerationCostPanel } from "@/components/editor/editor-generation-cost-panel";
import { EditorFusionLifeTimelinePanel } from "@/components/editor/editor-fusion-life-timeline-panel";
import { EditorTransformationSessionPanel } from "@/components/editor/editor-transformation-session-panel";
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
import { mergeInstructionSelection } from "@/lib/editor-instruction-studio";
import { executeEditorInstructionVariantApi } from "@/lib/editor-instruction-variant-client";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  instructionVariantWithStatus,
  patchInstructionVariant,
} from "@/lib/editor-instruction-version";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { resolveCompositionBrandIdentity } from "@/lib/editor-personalized-recommendations";
import { combineIntentOption } from "@/lib/editor-workflow-product";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type {
  EditorCompositionReferenceType,
  EditorCompositionTargetRole,
} from "@/types/editor-instruction-studio";
import { EDITOR_COMPOSITION_REFERENCE_TYPES, EDITOR_COMPOSITION_TARGET_ROLES } from "@/types/editor-instruction-studio";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [refType, setRefType] = useState<EditorCompositionReferenceType>("style");
  const [targetRole, setTargetRole] = useState<EditorCompositionTargetRole>("logo");
  const [selectedRefId, setSelectedRefId] = useState("");
  const [selectedObjectLabel, setSelectedObjectLabel] = useState("");
  const [itemInstruction, setItemInstruction] = useState("");

  const plan = useMemo(() => {
    const withPlan = ensureCompositionPlan(document);
    return getCompositionPlan(withPlan) ?? withPlan.instructionStudioState!.compositionPlan!;
  }, [document]);

  const base = resolveCompositionBaseImageUrl(document);
  const approved = activeApprovedVariant(document);

  const handleAddReference = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const analyzed = analyzeCompositionReference({
        name: file.name,
        url: uploaded.workingImageUrl,
        type: refType,
      });
      let next = addCompositionReference(document, analyzed);
      next = ensureCompositionPlan(next);
      onDocumentChange(next);
      setSelectedRefId(analyzed.id);
      setStatusMessage(t("editor.combine.referenceAdded" as never));
    } catch {
      setStatusMessage(t("editor.combine.referenceFailed" as never));
    } finally {
      setUploading(false);
    }
  };

  const handleAddPlanItem = () => {
    const ref = plan.references.find((r) => r.id === selectedRefId);
    if (!ref || !selectedObjectLabel.trim()) {
      setStatusMessage(t("editor.combine.planIncomplete" as never));
      return;
    }
    const item = buildCompositionPlanItem({
      targetRole,
      reference: ref,
      sourceObjectLabel: selectedObjectLabel.trim(),
      instruction: itemInstruction.trim() || undefined,
      order: plan.items.length,
    });
    onDocumentChange(appendCompositionPlanItem(document, item));
    setItemInstruction("");
    setStatusMessage(t("editor.combine.planItemAdded" as never));
  };

  const handleGenerate = async () => {
    const fusionPlan = document.instructionStudioState?.fusionPlan;
    if (plan.items.length === 0 && !fusionPlan?.userInstructions) {
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

    const runSingleGeneration = async (prompt: string, variantLabel: string) => {
      const selection = mergeInstructionSelection(document, undefined, {
        objectKey: "combine",
        objectLabel: "Combined composition",
        category: "other",
        action: "replace",
      });
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

    if (isSequence && transformationSession) {
      for (const step of transformationSession.steps) {
        const stepPrompt = buildTransformationStepPrompt({
          session: transformationSession,
          step,
          userInstruction: fusionPlan?.userInstructions,
        });
        const outcome = await runSingleGeneration(
          stepPrompt,
          `${t("editor.combine.variantName" as never)} ${step.index + 1}/${transformationSession.stepCount}`
        );
        latestDoc = outcome.nextDoc;
        if (outcome.ok) {
          successfulOutputs += 1;
        } else {
          failedOutputs += 1;
        }
      }
    } else {
      const prompt =
        fusionPlan
          ? buildEditorFusionPrompt({
              plan: fusionPlan,
              brandIdentity: resolveCompositionBrandIdentity(recCtx),
              preserveStyle: document.instructionStudioState?.selection?.sliders?.preserveStyle,
              preserveBrand: document.instructionStudioState?.selection?.sliders?.brandPreservation,
            })
          : buildEditorCompositionPrompt({
              plan,
              brandIdentity: resolveCompositionBrandIdentity(recCtx),
              preserveStyle: document.instructionStudioState?.selection?.sliders?.preserveStyle,
              preserveBrand: document.instructionStudioState?.selection?.sliders?.brandPreservation,
            });
      const outcome = await runSingleGeneration(prompt, t("editor.combine.variantName" as never));
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

    onDocumentChange(latestDoc);
    setStatusMessage(
      successfulOutputs > 0
        ? t("editor.combine.generateSuccess" as never)
        : t("editor.combine.generateFailed" as never)
    );
    setGenerating(false);
  };

  const selectedRef = plan.references.find((r) => r.id === selectedRefId);

  const combineIntent = document.instructionStudioState?.combineIntent;

  useEffect(() => {
    if (document.editorFlowMode === "combine" && !document.instructionStudioState?.fusionPlan) {
      onDocumentChange(ensureFusionPlan(document));
    }
  }, [document, onDocumentChange]);

  return (
    <div className="space-y-4">
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
      <EditorFusionPlanPanel document={document} />
      <EditorFusionSetupPanel document={document} onDocumentChange={onDocumentChange} />
      <EditorFusionLifeTimelinePanel document={document} onDocumentChange={onDocumentChange} />
      <EditorTransformationSessionPanel document={document} onDocumentChange={onDocumentChange} />
      <EditorGenerationCostPanel document={document} user={access} useCredits />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
      <section className={`space-y-3 p-4 ${studioVisual.editorSurface}`}>
        <h2 className="text-sm font-bold text-zinc-900">{t("editor.combine.baseImage" as never)}</h2>
        <img
          src={base.url}
          alt=""
          className="w-full rounded-lg border border-zinc-200 object-contain"
        />
        <p className="text-xs text-zinc-500">
          {base.variantId ?
            t("editor.combine.baseVariant" as never)
          : t("editor.combine.baseOriginal" as never)}
        </p>
      </section>

      <section className={`space-y-3 p-4 ${studioVisual.editorSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-900">
            {t("editor.combine.references" as never)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={refType}
              onChange={(e) => setRefType(e.target.value as EditorCompositionReferenceType)}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
            >
              {EDITOR_COMPOSITION_REFERENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`editor.combine.refType.${type}` as never)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={uploading || busy}
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("editor.combine.addReference" as never)}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleAddReference(file);
                }
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {plan.references.length === 0 ?
            <p className="text-sm text-zinc-500">{t("editor.combine.noReferences" as never)}</p>
          : plan.references.map((ref) => (
              <div key={ref.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex gap-3">
                  <img
                    src={ref.url}
                    alt=""
                    className="h-16 w-16 rounded border border-zinc-200 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{ref.name}</p>
                    <p className="text-xs text-zinc-500">
                      {t(`editor.combine.refType.${ref.type}` as never)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {(ref.editableObjectLabels ?? []).slice(0, 4).join(", ") ||
                        t("editor.combine.noObjects" as never)}
                    </p>
                    {(ref.styleTraitLabels ?? []).length > 0 ?
                      <p className="text-xs text-zinc-500">
                        {t("editor.combine.styleTraits" as never)}:{" "}
                        {(ref.styleTraitLabels ?? []).slice(0, 3).join(", ")}
                      </p>
                    : null}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRefId(ref.id);
                      setSelectedObjectLabel(ref.editableObjectLabels?.[0] ?? "");
                    }}
                    className="text-xs font-semibold text-[#0067B1]"
                  >
                    {t("editor.combine.useInPlan" as never)}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onDocumentChange(reanalyzeCompositionReference(document, ref.id))
                    }
                    className="text-xs font-semibold text-zinc-600"
                  >
                    {t("editor.combine.reanalyze" as never)}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDocumentChange(removeCompositionReference(document, ref.id))}
                    className="text-xs font-semibold text-red-600"
                  >
                    {t("editor.combine.remove" as never)}
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </section>

      <section className={`space-y-3 p-4 ${studioVisual.editorSurface}`}>
        <h2 className="text-sm font-bold text-zinc-900">{t("editor.combine.planTitle" as never)}</h2>

        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as EditorCompositionTargetRole)}
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
          >
            {EDITOR_COMPOSITION_TARGET_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`editor.combine.targetRole.${role}` as never)}
              </option>
            ))}
          </select>
          <select
            value={selectedRefId}
            onChange={(e) => {
              setSelectedRefId(e.target.value);
              const ref = plan.references.find((r) => r.id === e.target.value);
              setSelectedObjectLabel(ref?.editableObjectLabels?.[0] ?? "");
            }}
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
          >
            <option value="">{t("editor.combine.selectReference" as never)}</option>
            {plan.references.map((ref) => (
              <option key={ref.id} value={ref.id}>
                {ref.name}
              </option>
            ))}
          </select>
          {selectedRef ?
            <select
              value={selectedObjectLabel}
              onChange={(e) => setSelectedObjectLabel(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
            >
              {(selectedRef.editableObjectLabels ?? []).map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          : null}
          <input
            value={itemInstruction}
            onChange={(e) => setItemInstruction(e.target.value)}
            placeholder={t("editor.combine.instructionPlaceholder" as never)}
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={handleAddPlanItem}
            className="w-full rounded-full border border-[#0067B1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0067B1]"
          >
            {t("editor.combine.addPlanItem" as never)}
          </button>
        </div>

        <ul className="space-y-2">
          {plan.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs">
              <span className="font-semibold">
                {t(`editor.combine.targetRole.${item.targetRole}` as never)}
              </span>
              {" ← "}
              {item.sourceObjectLabel}
              <button
                type="button"
                onClick={() => onDocumentChange(removeCompositionPlanItem(document, item.id))}
                className="ml-2 text-red-600"
              >
                {t("editor.combine.remove" as never)}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generating || busy}
            onClick={() => void handleGenerate()}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {generating ?
              t("editor.combine.generating" as never)
            : t("editor.combine.generate" as never)}
          </button>
          <button
            type="button"
            onClick={() => {
              onDocumentChange(patchCompositionPlan(document, plan));
              onSave?.();
              setStatusMessage(t("editor.combine.planSaved" as never));
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800"
          >
            {t("editor.combine.savePlan" as never)}
          </button>
        </div>
      </section>

      {statusMessage ?
        <p className="lg:col-span-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {statusMessage}
        </p>
      : null}
      </div>
    </div>
  );
}
