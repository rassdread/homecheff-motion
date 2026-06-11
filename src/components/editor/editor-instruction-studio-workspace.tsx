"use client";

import { useMemo, useState } from "react";
import { EditorInstructionChangePlanPanel } from "@/components/editor/editor-instruction-change-plan-panel";
import { EditorInstructionEditPanel } from "@/components/editor/editor-instruction-edit-panel";
import { EditorInstructionObjectList } from "@/components/editor/editor-instruction-object-list";
import { EditorInstructionPreviewHighlight } from "@/components/editor/editor-instruction-preview-highlight";
import { EditorInstructionStyleTraitList } from "@/components/editor/editor-instruction-style-trait-list";
import { EditorInstructionComparisonCenter } from "@/components/editor/editor-instruction-comparison-center";
import { useActiveTranslator } from "@/i18n/client";
import { isBrandingAction } from "@/lib/editor-instruction-actions";
import {
  actionOptionKey,
  resolveDynamicActionsForObject,
} from "@/lib/editor-instruction-dynamic-actions";
import {
  approveInstructionVariant,
  archiveInstructionVariant,
  activeApprovedVariant,
  previewInstructionVariant,
  setActiveApprovedVariant,
} from "@/lib/editor-instruction-approval";
import { defaultBrandingPlacementHint, brandingWorkflowRequiresLogo } from "@/lib/editor-instruction-branding";
import { buildGenericBulkPlans, buildBulkVariantPlansFromPreset } from "@/lib/editor-instruction-bulk";
import {
  editorHandoffMotionUrl,
  editorHandoffStudioUrl,
} from "@/lib/editor-instruction-handoff";
import {
  defaultSelectionForObject,
  findInstructionObjectV2,
  getInstructionObjectFeed,
} from "@/lib/editor-instruction-object-v2";
import {
  appendChangePlanItem,
  appendStyleChangePlanItem,
  buildChangePlanItemFromSelection,
  buildStyleChangePlanItem,
  listChangePlan,
  listChangePlanEntries,
  validateChangePlanItemInput,
} from "@/lib/editor-instruction-change-plan";
import { EDITOR_STYLE_ACTIONS } from "@/lib/editor-style-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { evaluatePrintQuality, PRINT_PRESET_SPECS } from "@/lib/editor-instruction-print-export";
import {
  buildEditorInstructionPromptV2,
  buildEditorInstructionPromptV3,
  buildEditorInstructionVariantPayload,
} from "@/lib/editor-instruction-prompt-builder";
import {
  appendBrandReference,
  buildInstructionReferences,
  createBrandReferenceAsset,
  createUploadedReference,
  findBrandReference,
  setProductReference,
  setStyleReference,
} from "@/lib/editor-instruction-references";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { listCreatorPresetsForContext } from "@/lib/editor-personalized-recommendations";
import { isLegacyCanvasEditorDocument, mergeInstructionSelection } from "@/lib/editor-instruction-studio";
import {
  executeEditorInstructionBulkVariantApi,
  executeEditorInstructionVariantApi,
} from "@/lib/editor-instruction-variant-client";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  deleteInstructionVariant,
  instructionVariantWithStatus,
  listInstructionVariants,
  patchInstructionVariant,
  renameInstructionVariant,
  setPreviewInstructionVariant,
} from "@/lib/editor-instruction-version";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorCreatorPresetId,
  EditorStyleAttribute,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  isAdmin?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSave?: () => void;
};

export function EditorInstructionStudioWorkspace({
  document,
  busy = false,
  isAdmin = false,
  onDocumentChange,
  onSave,
}: Props) {
  const t = useActiveTranslator();
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [colorInput, setColorInput] = useState("");
  const [addPlanReason, setAddPlanReason] = useState("");
  const [focusMode, setFocusMode] = useState<"object" | "style">("object");
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);
  const [expandedStyleAttribute, setExpandedStyleAttribute] = useState<EditorStyleAttribute | null>(
    null
  );
  const [selectedStyleAttribute, setSelectedStyleAttribute] =
    useState<EditorStyleAttribute>("color_palette");
  const [selectedStyleActionId, setSelectedStyleActionId] = useState(
    EDITOR_STYLE_ACTIONS.color_palette[0]!.id
  );
  const [styleDescription, setStyleDescription] = useState("");
  const [selectedActionKey, setSelectedActionKey] = useState("");

  const { editableObjects: objectsV2, styleTraits, meta: objectFeedMeta } = useMemo(
    () => getInstructionObjectFeed(document),
    [document]
  );
  const recCtx = useMemo(
    () => buildEditorRecommendationContext({ document, isAdmin }),
    [document, isAdmin]
  );
  const creatorPresets = useMemo(() => listCreatorPresetsForContext(recCtx), [recCtx]);
  const variants = listInstructionVariants(document);
  const completedVariants = variants.filter(
    (v) => v.status === "completed" || Boolean(v.resultUrl?.trim())
  );
  const showResults = completedVariants.length > 0;
  const legacyReadOnly = isLegacyCanvasEditorDocument(document);
  const previewVariant = previewInstructionVariant(document);
  const approvedActive = activeApprovedVariant(document);
  const previewVariantId = document.instructionStudioState?.previewVariantId ?? null;

  const storedSelection = document.instructionStudioState?.selection;
  const initialObject = objectsV2[0];
  const selection = mergeInstructionSelection(document, storedSelection, {
    objectKey: storedSelection?.objectKey ?? initialObject?.id ?? "obj_main",
    objectLabel: storedSelection?.objectLabel ?? initialObject?.label ?? "Main subject",
    category: storedSelection?.category ?? initialObject?.category ?? "other",
    action: storedSelection?.action ?? initialObject?.suggestedActions[0] ?? "replace",
  });

  const selectedObject =
    objectsV2.find((o) => o.id === selection.objectKey) ?? objectsV2[0] ?? null;

  const logoRef = findBrandReference(document, selection.logoReferenceId);
  const showBranding = brandingWorkflowRequiresLogo(selection.action);
  const previewHighlightObject = focusMode === "object" ? selectedObject : null;

  const updateSelection = (patch: Parameters<typeof mergeInstructionSelection>[2]) => {
    const next = mergeInstructionSelection(document, selection, patch);
    onDocumentChange({
      ...document,
      instructionStudioState: { ...document.instructionStudioState, selection: next },
      updatedAt: new Date().toISOString(),
    });
  };

  const runVariantGeneration = async (params: {
    prompt: string;
    instruction: typeof selection;
    references: ReturnType<typeof buildInstructionReferences>;
    changePlan?: ReturnType<typeof listChangePlan>;
    variantName?: string;
    parentVariantId?: string | null;
    presetId?: string;
  }) => {
    let nextDoc = appendInstructionVariant(
      document,
      createPendingInstructionVariant({
        sourceImageUrl: document.backgroundUrl,
        sourceImageId: "background",
        instruction: params.instruction,
        prompt: params.prompt,
        references: params.references,
        changePlan: params.changePlan,
        outputTarget: document.instructionStudioState?.outputTarget,
        provider: "openai",
        name: params.variantName,
        parentVariantId: params.parentVariantId ?? approvedActive?.id ?? null,
        presetId: params.presetId,
      })
    );
    onDocumentChange(nextDoc);
    const pendingId = nextDoc.instructionStudioState?.previewVariantId;
    if (!pendingId) {
      return null;
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
      imageUrl: document.backgroundUrl,
      prompt: params.prompt,
      instruction: params.instruction,
      changePlan: params.changePlan,
      references: params.references,
      variantName: params.variantName,
      parentVariantId: params.parentVariantId,
    });

    const variant = nextDoc.instructionVariants!.find((v) => v.id === pendingId)!;
    if (!result.ok || !result.resultUrl) {
      onDocumentChange(
        patchInstructionVariant(
          nextDoc,
          pendingId,
          instructionVariantWithStatus(variant, "failed", {
            error: result.error ?? t("editor.instructionStudio.generateFailed" as never),
          })
        )
      );
      return null;
    }

    onDocumentChange(
      patchInstructionVariant(
        nextDoc,
        pendingId,
        instructionVariantWithStatus(variant, "completed", {
          resultUrl: result.resultUrl,
          resultStorageKey: result.storageKey,
          provider: result.provider,
          model: result.model,
          costEstimateUsd: result.costEstimateUsd,
          versionNote: result.versionNote,
        })
      )
    );
    return pendingId;
  };

  const selectObject = (obj: NonNullable<typeof selectedObject>) => {
    const dynamicActions = resolveDynamicActionsForObject(obj);
    const first = dynamicActions[0];
    setFocusMode("object");
    setExpandedObjectId(obj.id);
    setExpandedStyleAttribute(null);
    if (first) {
      setSelectedActionKey(actionOptionKey(first, 0));
    }
    updateSelection({
      ...defaultSelectionForObject(obj),
      action: first?.action ?? defaultSelectionForObject(obj).action,
      customPrompt: first?.promptHint ? `Focus on ${first.promptHint}` : undefined,
    });
    setColorInput("");
    setAddPlanReason("");
  };

  const selectStyleAttribute = (attribute: EditorStyleAttribute) => {
    setFocusMode("style");
    setSelectedStyleAttribute(attribute);
    setExpandedStyleAttribute(attribute);
    setSelectedStyleActionId(EDITOR_STYLE_ACTIONS[attribute][0]?.id ?? "");
    setStyleDescription("");
  };

  const handleAddStyleToChangePlan = () => {
    const action =
      EDITOR_STYLE_ACTIONS[selectedStyleAttribute].find((a) => a.id === selectedStyleActionId) ??
      EDITOR_STYLE_ACTIONS[selectedStyleAttribute][0];
    if (!action) {
      return;
    }
    const item = buildStyleChangePlanItem({
      styleAttribute: selectedStyleAttribute,
      action,
      strength: DEFAULT_EDITOR_INSTRUCTION_SLIDERS.changeStrength,
      order: listChangePlanEntries(document).length,
    });
    onDocumentChange(appendStyleChangePlanItem(document, item));
    setStatusMessage(t("editor.instructionStudio.v2.style.added" as never));
  };

  const handleAddToChangePlan = () => {
    const validation = validateChangePlanItemInput(
      { ...selection, color: colorInput },
      document
    );
    if (!validation.ok) {
      setAddPlanReason(t((validation.reasonKey ?? "") as never));
      return;
    }
    setAddPlanReason("");
    const item = buildChangePlanItemFromSelection(
      { ...selection, color: colorInput || undefined },
      listChangePlan(document).length
    );
    onDocumentChange(appendChangePlanItem(document, item));
    setStatusMessage(t("editor.instructionStudio.v2.changePlan.added" as never));
  };

  const handleGenerateFromPlan = async () => {
    const entries = listChangePlanEntries(document);
    if (entries.length === 0) {
      return;
    }
    setGenerating(true);
    setStatusMessage(t("editor.instructionStudio.generating" as never));
    const references = buildInstructionReferences(document, selection);
    const prompt = buildEditorInstructionPromptV3({
      entries,
      brandIdentity: recCtx.brandName,
      references,
      preserveStyle: selection.sliders.preserveStyle,
      preserveBrand: selection.sliders.brandPreservation,
    });
    const objectPlan = listChangePlan(document);
    const first = objectPlan[0];
    const instruction = mergeInstructionSelection(
      document,
      undefined,
      first
        ? {
            objectKey: first.objectId,
            objectLabel: first.objectLabel,
            category: first.objectCategory,
            action: first.action,
          }
        : {
            objectKey: selection.objectKey,
            objectLabel: selection.objectLabel,
            category: selection.category,
            action: selection.action,
          }
    );
    await runVariantGeneration({
      prompt,
      instruction,
      references,
      changePlan: objectPlan,
      variantName: `Change plan (${entries.length})`,
    });
    setGenerating(false);
    setStatusMessage(t("editor.instructionStudio.v2.changePlan.generated" as never));
  };

  const handleGenerateVariant = async () => {
    if (legacyReadOnly) {
      setStatusMessage(t("editor.instructionStudio.legacyReadOnly" as never));
      return;
    }
    if (showBranding && !logoRef) {
      setStatusMessage(t("editor.instructionStudio.v2.branding.logoRequired" as never));
      return;
    }
    setGenerating(true);
    setStatusMessage(t("editor.instructionStudio.generating" as never));
    const payload = buildEditorInstructionVariantPayload({
      ...selection,
      logoReference: logoRef,
      references: buildInstructionReferences(document, selection),
      brandingPlacementHint:
        selection.brandingPlacementHint ?? defaultBrandingPlacementHint(selection.category),
    });
    const id = await runVariantGeneration({
      prompt: payload.prompt,
      instruction: payload.instruction,
      references: payload.references,
    });
    setGenerating(false);
    setStatusMessage(
      id
        ? t("editor.instructionStudio.v2.generateDraftSuccess" as never)
        : t("editor.instructionStudio.generateFailed" as never)
    );
  };

  const handleBulkGenerate = async (presetId?: EditorCreatorPresetId) => {
    if (legacyReadOnly) {
      return;
    }
    if (presetId) {
      onDocumentChange({
        ...document,
        instructionStudioState: {
          ...document.instructionStudioState,
          selectedCreatorPresetId: presetId,
        },
        updatedAt: new Date().toISOString(),
      });
    }
    setGenerating(true);
    const plans = presetId ? buildBulkVariantPlansFromPreset(presetId) : buildGenericBulkPlans(4);
    const references = buildInstructionReferences(document, selection);
    const basePrompt = buildEditorInstructionPromptV2({ ...selection, references, logoReference: logoRef });
    const response = await executeEditorInstructionBulkVariantApi({
      sessionId: document.sessionId,
      imageUrl: document.backgroundUrl,
      instruction: selection,
      references,
      plans,
    });
    let nextDoc = document;
    for (const result of response.results) {
      if (!result.ok || !result.resultUrl) {
        continue;
      }
      const pending = createPendingInstructionVariant({
        sourceImageUrl: document.backgroundUrl,
        sourceImageId: "background",
        instruction: result.instruction ?? selection,
        prompt: result.prompt ?? basePrompt,
        references,
        name: result.variantName,
        presetId: presetId,
      });
      nextDoc = appendInstructionVariant(nextDoc, pending);
      nextDoc = patchInstructionVariant(
        nextDoc,
        pending.id,
        instructionVariantWithStatus(pending, "completed", {
          resultUrl: result.resultUrl,
          resultStorageKey: result.storageKey,
          provider: result.provider,
          model: result.model,
          versionNote: result.versionNote,
        })
      );
    }
    onDocumentChange(nextDoc);
    setGenerating(false);
    setStatusMessage(t("editor.instructionStudio.v2.bulkSuccess" as never));
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const asset = createBrandReferenceAsset({
        name: file.name,
        url: uploaded.workingImageUrl,
        transparentBackground: true,
      });
      let nextDoc = appendBrandReference(document, asset);
      const obj = findInstructionObjectV2(nextDoc, selection.objectKey);
      nextDoc = {
        ...nextDoc,
        instructionStudioState: {
          ...nextDoc.instructionStudioState,
          selection: {
            ...selection,
            logoReferenceId: asset.id,
            action: isBrandingAction(selection.action) ? selection.action : "add_logo",
            brandingPlacementHint:
              selection.brandingPlacementHint ??
              defaultBrandingPlacementHint(obj?.category ?? selection.category),
          },
        },
      };
      onDocumentChange(nextDoc);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleReferenceUpload = async (
    file: File,
    kind: "style" | "product"
  ) => {
    const uploaded = await uploadEditorSourceImage(file);
    const ref = createUploadedReference(
      kind === "style" ? "STYLE_REFERENCE" : "PRODUCT_REFERENCE",
      { url: uploaded.workingImageUrl, label: file.name }
    );
    onDocumentChange(
      kind === "style" ? setStyleReference(document, ref) : setProductReference(document, ref)
    );
  };

  const previewUrl =
    previewVariant?.resultUrl && previewVariantId
      ? previewVariant.resultUrl
      : approvedActive?.resultUrl ?? null;

  return (
    <div className="space-y-4" data-testid="instruction-studio-workspace">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        <div className="space-y-3 xl:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.instructionStudio.v2.previewColumn" as never)}
          </p>
          <div>
            <p className="mb-1 text-xs text-zinc-600">
              {t("editor.instructionStudio.originalLabel" as never)}
            </p>
            <EditorInstructionPreviewHighlight
              document={document}
              imageUrl={document.backgroundUrl}
              selectedObject={previewHighlightObject}
            />
          </div>
          {previewUrl ?
            <div>
              <p className="mb-1 text-xs text-zinc-600">
                {approvedActive
                  ? t("editor.instructionStudio.v2.activeApproved" as never)
                  : t("editor.instructionStudio.variantLabel" as never)}
              </p>
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-white/15 bg-zinc-900/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="h-full w-full object-contain" />
              </div>
            </div>
          : null}
        </div>

        <div className="space-y-3 xl:col-span-3">
          <EditorInstructionObjectList
            objects={objectsV2}
            selectedObjectId={focusMode === "object" ? selection.objectKey : null}
            expandedObjectId={expandedObjectId}
            onSelect={selectObject}
            onToggleExpand={(id) =>
              setExpandedObjectId((prev) => (prev === id ? null : id))
            }
            lowConfidence={objectFeedMeta.lowConfidence}
          />
          <EditorInstructionStyleTraitList
            document={document}
            styleTraitLabels={styleTraits}
            selectedAttribute={focusMode === "style" ? selectedStyleAttribute : null}
            expandedAttribute={expandedStyleAttribute}
            onSelect={selectStyleAttribute}
            onToggleExpand={(attribute) =>
              setExpandedStyleAttribute((prev) => (prev === attribute ? null : attribute))
            }
          />
          {isAdmin ?
            <section className={`p-3 text-[11px] text-zinc-600 ${studioVisual.editorSurface}`}>
              <p className="font-semibold text-zinc-800">
                {t("editor.instructionStudio.v2.objectFeed.debugTitle" as never)}
              </p>
              <p>
                {t("editor.instructionStudio.v2.objectFeed.source" as never)}: {objectFeedMeta.source}
              </p>
              <p>
                {t("editor.instructionStudio.v2.objectFeed.count" as never)}: {objectFeedMeta.count}
              </p>
            </section>
          : null}
        </div>

        <div className="space-y-4 xl:col-span-5">
          {focusMode === "style" ?
            <EditorInstructionEditPanel
              mode="style"
              document={document}
              styleAttribute={selectedStyleAttribute}
              selectedActionId={selectedStyleActionId}
              onActionIdChange={setSelectedStyleActionId}
              description={styleDescription}
              onDescriptionChange={setStyleDescription}
              onAddToChangePlan={handleAddStyleToChangePlan}
            />
          : selectedObject ?
            <EditorInstructionEditPanel
              mode="object"
              document={document}
              object={selectedObject}
              selection={selection}
              colorInput={colorInput}
              addPlanReason={addPlanReason}
              uploadingLogo={uploadingLogo}
              onUpdateSelection={(patch) => updateSelection(patch)}
              onColorInputChange={setColorInput}
              onLogoUpload={handleLogoUpload}
              onStyleReferenceUpload={(file) => void handleReferenceUpload(file, "style")}
              onAddToChangePlan={handleAddToChangePlan}
              selectedActionKey={
                selectedActionKey ||
                actionOptionKey(resolveDynamicActionsForObject(selectedObject)[0]!, 0)
              }
              onActionKeyChange={(key, option) => {
                setSelectedActionKey(key);
                updateSelection({
                  action: option.action,
                  customPrompt: option.promptHint ? `Focus on ${option.promptHint}` : undefined,
                });
              }}
            />
          : (
            <section className={`p-4 text-sm text-zinc-600 ${studioVisual.editorSurface}`}>
              {t("editor.instructionStudio.v2.workspace.selectObjectPrompt" as never)}
            </section>
          )}

          <EditorInstructionChangePlanPanel
            document={document}
            onDocumentChange={onDocumentChange}
            onGenerateFromPlan={() => void handleGenerateFromPlan()}
            generating={generating}
          />

          <section className={`p-4 ${studioVisual.editorSurface}`}>
            <h3 className="text-sm font-semibold text-zinc-900">
              {t("editor.instructionStudio.v2.workspace.generationControls" as never)}
            </h3>
            <div className="mt-3 space-y-2">
              {(
                [
                  ["preserveStyle", "editor.instructionStudio.slider.preserveStyle"],
                  ["brandPreservation", "editor.instructionStudio.v2.slider.preserveBrand"],
                  ["creativity", "editor.instructionStudio.slider.creativity"],
                  ["changeStrength", "editor.instructionStudio.v2.slider.strength"],
                ] as const
              ).map(([key, labelKey]) => (
                <label key={key} className="block text-xs font-medium text-zinc-700">
                  {t(labelKey as never)}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selection.sliders[key]}
                    className="mt-1 w-full"
                    onChange={(e) =>
                      updateSelection({
                        sliders: { ...selection.sliders, [key]: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          {approvedActive?.approvalStatus === "approved" ?
            <section className={`p-4 ${studioVisual.editorSurface}`}>
              <h3 className="text-sm font-semibold text-slate-900">
                {t("editor.instructionStudio.v2.print.title" as never)}
              </h3>
              <p className="mt-1 text-xs text-zinc-600">
                {t("editor.instructionStudio.v2.print.lead" as never)}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                {PRINT_PRESET_SPECS.slice(0, 4).map((preset) => {
                  const report = evaluatePrintQuality({
                    preset: preset.id,
                    sourceWidthPx: 1200,
                    sourceHeightPx: 900,
                  });
                  return (
                    <li key={preset.id} className="flex justify-between gap-2">
                      <span>{t(preset.labelKey as never)}</span>
                      <span className="text-zinc-500">
                        {report.qualityScore}% · {report.widthPx}×{report.heightPx}px
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] text-amber-700">
                {t("editor.instructionStudio.v2.print.cmykNote" as never)}
              </p>
            </section>
          : null}

          <section className={`p-4 ${studioVisual.editorSurface}`}>
            <h3 className="text-sm font-semibold text-slate-900">
              {t("editor.instructionStudio.v2.presets.title" as never)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {creatorPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={generating || legacyReadOnly}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800"
                  onClick={() => void handleBulkGenerate(preset.id)}
                >
                  {t(preset.labelKey as never)}
                </button>
              ))}
              <button
                type="button"
                disabled={generating || legacyReadOnly}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800"
                onClick={() => void handleBulkGenerate()}
              >
                {t("editor.instructionStudio.v2.bulk.generate4" as never)}
              </button>
            </div>
          </section>

          {statusMessage ?
            <p className="text-sm text-zinc-600" role="status">
              {statusMessage}
            </p>
          : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || generating || legacyReadOnly}
              onClick={() => void handleGenerateVariant()}
              className="min-h-11 flex-1 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("editor.instructionStudio.generateVariant" as never)}
            </button>
            {previewVariantId && previewVariant ?
              <>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900"
                  onClick={() =>
                    onDocumentChange(approveInstructionVariant(document, previewVariantId))
                  }
                >
                  {t("editor.instructionStudio.v2.approve" as never)}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
                  onClick={() =>
                    onDocumentChange(archiveInstructionVariant(document, previewVariantId))
                  }
                >
                  {t("editor.instructionStudio.v2.reject" as never)}
                </button>
                {previewVariant.approvalStatus === "approved" ?
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-[#0067B1] px-4 py-2 text-sm font-semibold text-[#0067B1]"
                    onClick={() => {
                      const next = setActiveApprovedVariant(document, previewVariantId);
                      if (next) {
                        onDocumentChange(next);
                      }
                    }}
                  >
                    {t("editor.instructionStudio.v2.setActive" as never)}
                  </button>
                : null}
              </>
            : null}
            {onSave ?
              <button
                type="button"
                disabled={busy}
                onClick={onSave}
                className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
              >
                {t("editor.instructionStudio.save" as never)}
              </button>
            : null}
            <button
              type="button"
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
              onClick={() => window.open(editorHandoffStudioUrl(document), "_blank", "noopener,noreferrer")}
            >
              {t("editor.instructionStudio.toStudio" as never)}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
              onClick={() => window.open(editorHandoffMotionUrl(document), "_blank", "noopener,noreferrer")}
            >
              {t("editor.instructionStudio.toMotion" as never)}
            </button>
          </div>
        </div>
      </div>

      {showResults ?
        <section data-testid="instruction-results-panel">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            {t("editor.instructionStudio.v2.results.title" as never)}
          </h2>
          <EditorInstructionComparisonCenter
            document={document}
            variants={variants}
            previewVariantId={previewVariantId}
            compareVariantIds={compareIds}
            onPreview={(id) =>
              onDocumentChange(setPreviewInstructionVariant(document, id || null))
            }
            onToggleCompare={(id) =>
              setCompareIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 3)
              )
            }
            onRename={(id, name) => onDocumentChange(renameInstructionVariant(document, id, name))}
            onDelete={(id) => onDocumentChange(deleteInstructionVariant(document, id))}
            onNote={(id, note) =>
              onDocumentChange(patchInstructionVariant(document, id, { userNote: note }))
            }
          />
        </section>
      : null}
    </div>
  );
}
