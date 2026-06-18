"use client";

import { useEffect, useMemo, useState } from "react";
import { publishAssistantEditorContext } from "@/lib/assistant-editor-context-bridge";
import { buildAssistantEditorContextFromHierarchy } from "@/lib/assistant-editor-context-builder";
import { EditorInstructionChangePlanPanel } from "@/components/editor/editor-instruction-change-plan-panel";
import { EditorInstructionEditPanel } from "@/components/editor/editor-instruction-edit-panel";
import { EditorInstructionObjectList } from "@/components/editor/editor-instruction-object-list";
import { EditorVisionHierarchyPanel } from "@/components/editor/editor-vision-hierarchy-panel";
import { EditorInstructionPreviewHighlight } from "@/components/editor/editor-instruction-preview-highlight";
import { EditorInstructionStyleTraitList } from "@/components/editor/editor-instruction-style-trait-list";
import { EditorInstructionComparisonCenter } from "@/components/editor/editor-instruction-comparison-center";
import { EditorPlanSummaryPanel } from "@/components/editor/editor-plan-summary-panel";
import { EditorPostGenerationActionCenter } from "@/components/editor/editor-post-generation-action-center";
import { EditorDetectionStatusBanner } from "@/components/editor/editor-detection-status-banner";
import { EditorTargetPrecisionPanel } from "@/components/editor/editor-target-precision-panel";
import { EditorVariantCallDebugPanel } from "@/components/editor/editor-variant-call-debug-panel";
import { EditorVisionSummaryPanel } from "@/components/editor/editor-vision-summary-panel";
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
import {
  evaluatePrintQuality,
  PRINT_PRESET_SPECS,
} from "@/lib/editor-instruction-print-export";
import { EDITOR_STYLE_ACTIONS } from "@/lib/editor-style-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  assessVariantPrecisionRisk,
  buildProtectionPlanFromChangePlan,
  buildTargetPrecisionContext,
  ensureChangePlanPrecision,
  mergePrecisionWarnings,
  strongerProtectionSliders,
} from "@/lib/editor-instruction-target-precision";
import { verifyVariantRegionPrecision } from "@/lib/editor-instruction-region-verification-client";
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
  resolveInstructionObjectFromHierarchyNode,
  selectionPatchFromHierarchyNode,
  styleAttributeFromHierarchyNode,
} from "@/lib/editor-hierarchy-object-resolution";
import { extractPartToLibrary } from "@/lib/editor-part-extraction";
import { runEditorVisionAndObjectDetection } from "@/lib/editor-canvas-session";
import { editorPhaseShowsSection } from "@/lib/editor-workflow-phases";
import {
  documentHasRichVisionAnalysis,
  isMeaningfulVisionHierarchy,
  resolveStickyVisionHierarchy,
  traceVisionHierarchyStage,
} from "@/lib/editor-vision-v6-stability";
import { listEditorAnalysisTimings } from "@/lib/editor-analysis-performance";
import {
  executeEditorInstructionBulkVariantApi,
  executeEditorInstructionVariantApi,
  EditorVariantPreflightBlockedError,
  recordEditorVariantPreflightBlock,
} from "@/lib/editor-instruction-variant-client";
import {
  logEditorVariantPreflightDev,
  preflightEditorInstructionVariant,
  variantValidationMessageKey,
  type EditorVariantTriggerSource,
} from "@/lib/editor-instruction-variant-preflight";
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
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";
import type {
  EditorCreatorPresetId,
  EditorImagePhase,
  EditorInstructionObjectV2,
  EditorStyleAttribute,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

const VARIANT_WORKSPACE_COMPONENT = "EditorInstructionStudioWorkspace";

function variantButtonNameForTrigger(
  trigger: EditorVariantTriggerSource,
  presetId?: string
): string {
  if (trigger === "instruction_generate_variant") {
    return "instruction-generate-variant";
  }
  if (trigger === "instruction_generate_from_plan") {
    return "instruction-change-plan-generate";
  }
  if (trigger === "instruction_bulk_generate") {
    return presetId ? `instruction-bulk-preset-${presetId}` : "instruction-bulk-generate-4";
  }
  return trigger;
}

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  isAdmin?: boolean;
  activePhase?: EditorImagePhase;
  motionUnlocked?: boolean;
  onPhaseChange?: (phase: EditorImagePhase) => void;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSave?: () => void;
};

export function EditorInstructionStudioWorkspace({
  document,
  busy = false,
  isAdmin = false,
  activePhase = "edit",
  motionUnlocked = false,
  onPhaseChange,
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
  const [manualFocusMode, setManualFocusMode] = useState<"object" | "style" | null>(null);
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
  const [selectedHierarchyNodeId, setSelectedHierarchyNodeId] = useState<string | null>(null);
  const [virtualSelectedObject, setVirtualSelectedObject] = useState<EditorInstructionObjectV2 | null>(
    null
  );

  useEffect(() => {
    setVirtualSelectedObject(null);
    setExpandedObjectId(null);
    setExpandedStyleAttribute(null);
    setSelectedHierarchyNodeId(null);
    setManualFocusMode(null);
    setCompareIds([]);
    setStatusMessage("");
  }, [document.sessionId, document.backgroundUrl]);

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
    virtualSelectedObject ??
    objectsV2.find((o) => o.id === selection.objectKey) ??
    objectsV2[0] ??
    null;

  const focusMode = useMemo((): "object" | "style" => {
    if (activePhase === "colors" || activePhase === "style") {
      return "style";
    }
    if (activePhase === "parts" || activePhase === "edit" || activePhase === "director") {
      return "object";
    }
    return manualFocusMode ?? "object";
  }, [activePhase, manualFocusMode]);

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

  const applyVariantPreflight = (
    input: Parameters<typeof preflightEditorInstructionVariant>[0],
    buttonName: string,
    route: "/api/editor/instruction/variant" | "/api/editor/instruction/variant/bulk"
  ) => {
    const audit = preflightEditorInstructionVariant(input);
    logEditorVariantPreflightDev(audit, { isAdmin });
    if (!audit.validation.ok) {
      const messageKey = variantValidationMessageKey(audit.validation);
      if (messageKey) {
        setStatusMessage(t(messageKey as never));
      }
      recordEditorVariantPreflightBlock({
        triggerSource: input.triggerSource,
        sessionId: input.sessionId,
        route,
        trace: {
          componentName: VARIANT_WORKSPACE_COMPONENT,
          buttonName,
        },
        validationCode: audit.validation.code,
      });
    }
    return audit;
  };

  const variantGeneratePayload = useMemo(() => {
    const references = buildInstructionReferences(document, selection);
    return buildEditorInstructionVariantPayload({
      ...selection,
      color: colorInput || undefined,
      logoReference: logoRef,
      references,
      brandingPlacementHint:
        selection.brandingPlacementHint ?? defaultBrandingPlacementHint(selection.category),
      document,
    });
  }, [colorInput, document, logoRef, selection]);

  const variantInstructionForValidation = useMemo(
    () => ({
      ...variantGeneratePayload.instruction,
      color: colorInput || undefined,
    }),
    [colorInput, variantGeneratePayload.instruction]
  );

  const canGenerateVariant = useMemo(() => {
    if (legacyReadOnly || (showBranding && !logoRef)) {
      return false;
    }
    return preflightEditorInstructionVariant({
      triggerSource: "instruction_generate_variant",
      sessionId: document.sessionId,
      imageUrl: document.backgroundUrl,
      prompt: variantGeneratePayload.prompt,
      instruction: variantInstructionForValidation,
      document,
    }).validation.ok;
  }, [
    document,
    legacyReadOnly,
    logoRef,
    showBranding,
    variantGeneratePayload,
    variantInstructionForValidation,
  ]);

  const runVariantGeneration = async (params: {
    triggerSource: EditorVariantTriggerSource;
    prompt: string;
    instruction: typeof selection;
    references: ReturnType<typeof buildInstructionReferences>;
    changePlan?: ReturnType<typeof listChangePlan>;
    variantName?: string;
    parentVariantId?: string | null;
    presetId?: string;
    strongerProtection?: boolean;
  }) => {
    const buttonName = variantButtonNameForTrigger(params.triggerSource, params.presetId);
    const audit = applyVariantPreflight(
      {
        triggerSource: params.triggerSource,
        sessionId: document.sessionId,
        imageUrl: document.backgroundUrl,
        prompt: params.prompt,
        instruction: params.instruction,
        changePlan: params.changePlan,
        document,
      },
      buttonName,
      "/api/editor/instruction/variant"
    );
    if (!audit.validation.ok) {
      return null;
    }

    const strongerProtection =
      params.strongerProtection ?? document.instructionStudioState?.strongerProtection === true;
    const instructionForVariant = strongerProtection
      ? { ...params.instruction, sliders: strongerProtectionSliders(params.instruction.sliders) }
      : params.instruction;
    const precisionCtx = buildTargetPrecisionContext(document, {
      ...instructionForVariant,
      color: instructionForVariant.color ?? (colorInput || undefined),
    }, { strongerProtection });
    const protectionPlan =
      params.changePlan?.length
        ? buildProtectionPlanFromChangePlan(document, params.changePlan)
        : precisionCtx.protectionPlan;

    let nextDoc = appendInstructionVariant(
      document,
      createPendingInstructionVariant({
        sourceImageUrl: document.backgroundUrl,
        sourceImageId: "background",
        instruction: instructionForVariant,
        prompt: params.prompt,
        references: params.references,
        changePlan: params.changePlan,
        protectionPlan,
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

    let result;
    try {
      result = await executeEditorInstructionVariantApi({
        sessionId: document.sessionId,
        imageUrl: document.backgroundUrl,
        prompt: params.prompt,
        instruction: params.instruction,
        changePlan: params.changePlan,
        references: params.references,
        variantName: params.variantName,
        parentVariantId: params.parentVariantId,
        document,
        triggerSource: params.triggerSource,
        trace: {
          componentName: VARIANT_WORKSPACE_COMPONENT,
          buttonName,
        },
        debug: { isAdmin },
      });
    } catch (error) {
      if (error instanceof EditorVariantPreflightBlockedError) {
        const variant = nextDoc.instructionVariants!.find((v) => v.id === pendingId)!;
        onDocumentChange(
          patchInstructionVariant(
            nextDoc,
            pendingId,
            instructionVariantWithStatus(variant, "failed", {
              error: error.message,
            })
          )
        );
        return null;
      }
      throw error;
    }

    const variant = nextDoc.instructionVariants!.find((v) => v.id === pendingId)!;
    const preCheckWarning = assessVariantPrecisionRisk({
      targetOnly: precisionCtx.targetOnly,
      estimatedSelection: precisionCtx.estimatedSelection,
      mascotDetected: precisionCtx.mascotDetected,
      extractionQuality: params.changePlan?.[0]?.extractionQuality,
    });
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

    const completedDoc = patchInstructionVariant(
      nextDoc,
      pendingId,
      instructionVariantWithStatus(variant, "completed", {
        resultUrl: result.resultUrl,
        resultStorageKey: result.storageKey,
        provider: result.provider,
        model: result.model,
        costEstimateUsd: result.costEstimateUsd,
        versionNote: result.versionNote,
        precisionWarning: preCheckWarning ?? undefined,
        protectionPlan,
      })
    );
    onDocumentChange(completedDoc);

    if (result.librarySaved) {
      setStatusMessage(t("library.consistency.savedSuccess" as never));
    }

    if (strongerProtection) {
      onDocumentChange({
        ...completedDoc,
        instructionStudioState: {
          ...completedDoc.instructionStudioState,
          strongerProtection: false,
        },
      });
    }

    void verifyVariantRegionPrecision({
      sourceUrl: document.backgroundUrl,
      resultUrl: result.resultUrl,
      plan: protectionPlan,
    }).then((verification) => {
      const precisionWarning = mergePrecisionWarnings(preCheckWarning, verification);
      onDocumentChange(
        patchInstructionVariant(completedDoc, pendingId, {
          precisionVerification: verification,
          precisionWarning: precisionWarning ?? undefined,
        })
      );
    });

    return pendingId;
  };

  const handleRegenerateWithStrongerProtection = async () => {
    const strongerSelection = {
      ...selection,
      sliders: strongerProtectionSliders(selection.sliders),
      color: colorInput || undefined,
    };
    const references = buildInstructionReferences(document, strongerSelection);
    const prompt = buildEditorInstructionVariantPayload({
      ...strongerSelection,
      logoReference: logoRef,
      references,
      brandingPlacementHint:
        selection.brandingPlacementHint ?? defaultBrandingPlacementHint(selection.category),
      document: {
        ...document,
        instructionStudioState: {
          ...document.instructionStudioState,
          strongerProtection: true,
          targetOnlyEdit: true,
        },
      },
    }).prompt;

    await runVariantGeneration({
      triggerSource: "instruction_generate_variant",
      prompt,
      instruction: strongerSelection,
      references,
      parentVariantId: previewVariantId,
      variantName: previewVariant?.name ? `${previewVariant.name} (strenger)` : "Variant (strenger)",
      strongerProtection: true,
    });
  };

  const setTargetOnlyEdit = (enabled: boolean) => {
    onDocumentChange({
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        targetOnlyEdit: enabled,
      },
    });
  };

  const selectObject = (obj: NonNullable<typeof selectedObject>) => {
    const dynamicActions = resolveDynamicActionsForObject(obj);
    const first = dynamicActions[0];
    setVirtualSelectedObject(
      obj.id.startsWith("obj_v6_") || obj.source === "semanticLayers" ? obj : null
    );
    setSelectedHierarchyNodeId(null);
    setManualFocusMode("object");
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
    setManualFocusMode("style");
    setSelectedStyleAttribute(attribute);
    setExpandedStyleAttribute(attribute);
    setSelectedStyleActionId(EDITOR_STYLE_ACTIONS[attribute][0]?.id ?? "");
    setStyleDescription("");
  };

  const displayHierarchy = useMemo(() => {
    traceVisionHierarchyStage("before_EditorVisionHierarchyPanel_render", document);
    return resolveStickyVisionHierarchy(document);
  }, [document]);

  useEffect(() => {
    publishAssistantEditorContext(
      buildAssistantEditorContextFromHierarchy({
        document,
        hierarchy: displayHierarchy,
        selectedNodeId: selectedHierarchyNodeId,
        selectedObjectLabel: virtualSelectedObject?.label ?? null,
      })
    );
  }, [
    document,
    displayHierarchy,
    selectedHierarchyNodeId,
    virtualSelectedObject?.label,
  ]);

  const hasRichHierarchy = isMeaningfulVisionHierarchy(displayHierarchy, document.visionV6Meta);
  const analysisPending =
    !documentHasRichVisionAnalysis(document) &&
    (document.objects.filter((o) => o.layerType !== "background").length === 0 ||
      !document.detectionMeta?.lastDetectedAt);
  const weakEstimatedOnly =
    !hasRichHierarchy && (displayHierarchy.length > 0 || analysisPending);
  const showParts = editorPhaseShowsSection(activePhase, "parts");
  const showAnalysis = editorPhaseShowsSection(activePhase, "analysis");
  const showObjectEdit = editorPhaseShowsSection(activePhase, "objectEdit");
  const showStyle = editorPhaseShowsSection(activePhase, "style");
  const showChangePlan = editorPhaseShowsSection(activePhase, "changePlan");
  const showVariants = editorPhaseShowsSection(activePhase, "variants");
  const showVersions = editorPhaseShowsSection(activePhase, "versions");
  const showApprove = editorPhaseShowsSection(activePhase, "approve");
  const styleFocus = activePhase === "colors" ? "color_palette" : selectedStyleAttribute;
  const expandedStyleForPanel =
    activePhase === "colors" ? "color_palette" : expandedStyleAttribute;

  const selectHierarchyNode = (node: EditorVisionHierarchyNode) => {
    setSelectedHierarchyNodeId(node.id);
    if (node.category === "style") {
      selectStyleAttribute(styleAttributeFromHierarchyNode(node));
      return;
    }
    const match = resolveInstructionObjectFromHierarchyNode(document, objectsV2, node);
    setVirtualSelectedObject(match);
    const patch = selectionPatchFromHierarchyNode(document, node, match);
    const dynamicActions = resolveDynamicActionsForObject(match);
    const first = dynamicActions[0];
    setManualFocusMode("object");
    setExpandedObjectId(match.id);
    setExpandedStyleAttribute(null);
    if (first) {
      setSelectedActionKey(actionOptionKey(first, 0));
    }
    updateSelection({
      ...defaultSelectionForObject(match),
      ...patch,
      action: first?.action ?? defaultSelectionForObject(match).action,
      customPrompt: first?.promptHint ? `Focus on ${first.promptHint}` : undefined,
    });
    setColorInput("");
    setAddPlanReason("");
  };

  const handleExtractSelectedPart = () => {
    if (!selectedObject) {
      return;
    }
    const next = extractPartToLibrary(document, {
      object: selectedObject,
      targetPartId: selection.targetPartId,
      targetLayerId: selection.targetLayerId,
      quality: selection.estimatedSelection ? "estimated_crop" : "estimated_crop",
    });
    onDocumentChange(next);
    setStatusMessage(t("editor.instructionStudio.v2.partActions.extractSaved" as never));
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
      listChangePlan(document).length,
      document
    );
    onDocumentChange(appendChangePlanItem(document, item));
    setStatusMessage(t("editor.instructionStudio.v2.changePlan.added" as never));
  };

  const handleGenerateFromPlan = async () => {
    const entries = listChangePlanEntries(document);
    if (entries.length === 0) {
      return;
    }
    const references = buildInstructionReferences(document, selection);
    const objectPlan = ensureChangePlanPrecision(document, listChangePlan(document));
    const prompt = buildEditorInstructionPromptV3({
      entries,
      brandIdentity: recCtx.brandName,
      references,
      preserveStyle: selection.sliders.preserveStyle,
      preserveBrand: selection.sliders.brandPreservation,
      document,
    });
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

    setGenerating(true);
    setStatusMessage(t("editor.instructionStudio.generating" as never));
    const variantId = await runVariantGeneration({
      triggerSource: "instruction_generate_from_plan",
      prompt,
      instruction,
      references,
      changePlan: objectPlan,
      variantName: `Change plan (${entries.length})`,
    });
    setGenerating(false);
    setStatusMessage(
      variantId
        ? t("editor.instructionStudio.v2.changePlan.generated" as never)
        : t("editor.instructionStudio.generateFailed" as never)
    );
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
    if (!canGenerateVariant) {
      applyVariantPreflight(
        {
          triggerSource: "instruction_generate_variant",
          sessionId: document.sessionId,
          imageUrl: document.backgroundUrl,
          prompt: variantGeneratePayload.prompt,
          instruction: variantInstructionForValidation,
          document,
        },
        "instruction-generate-variant",
        "/api/editor/instruction/variant"
      );
      return;
    }

    setGenerating(true);
    setStatusMessage(t("editor.instructionStudio.generating" as never));
    const id = await runVariantGeneration({
      triggerSource: "instruction_generate_variant",
      prompt: variantGeneratePayload.prompt,
      instruction: variantGeneratePayload.instruction,
      references: variantGeneratePayload.references,
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
    const references = buildInstructionReferences(document, selection);
    const basePrompt = buildEditorInstructionPromptV2({ ...selection, references, logoReference: logoRef });
    const audit = applyVariantPreflight(
      {
        triggerSource: "instruction_bulk_generate",
        sessionId: document.sessionId,
        imageUrl: document.backgroundUrl,
        prompt: basePrompt,
        instruction: selection,
        document,
      },
      variantButtonNameForTrigger("instruction_bulk_generate", presetId),
      "/api/editor/instruction/variant/bulk"
    );
    if (!audit.validation.ok) {
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
    const response = await executeEditorInstructionBulkVariantApi({
      sessionId: document.sessionId,
      imageUrl: document.backgroundUrl,
      instruction: selection,
      references,
      plans,
      document,
      triggerSource: "instruction_bulk_generate",
      trace: {
        componentName: VARIANT_WORKSPACE_COMPONENT,
        buttonName: variantButtonNameForTrigger("instruction_bulk_generate", presetId),
      },
      debug: { isAdmin },
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

  const analysisTimings = useMemo(() => {
    if (!isAdmin) {
      return [];
    }
    return listEditorAnalysisTimings(document.sessionId);
  }, [document.sessionId, document.detectionMeta?.lastDetectedAt, isAdmin]);

  return (
    <div className="space-y-4" data-testid="instruction-studio-workspace">
      {showAnalysis ?
        <div className="space-y-3">
          <EditorDetectionStatusBanner meta={document.detectionMeta} />
          <EditorVisionSummaryPanel document={document} />
        </div>
      : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        <div className="space-y-3 xl:col-span-4">
          <p className={`${studioVisual.eyebrowOnDark}`}>
            {t("editor.instructionStudio.v2.previewColumn" as never)}
          </p>
          <div>
            <p className="mb-1 text-xs text-white/75">
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
              <p className="mb-1 text-xs text-white/75">
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
          {showParts && analysisPending ?
            <section
              className="rounded-2xl border border-white/20 bg-[#003d6b]/55 p-4 text-white shadow-sm backdrop-blur-sm"
              data-testid="instruction-parts-analyzing"
            >
              <h3 className="text-sm font-semibold text-white">
                {t("editor.workflow.parts.analyzingTitle" as never)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                {t("editor.workflow.parts.analyzingLead" as never)}
              </p>
            </section>
          : null}
          {showParts && hasRichHierarchy ?
            <section
              className={`rounded-2xl border border-white/15 bg-white/95 p-3 shadow-sm ${studioVisual.editorSurface}`}
              data-testid="instruction-vision-hierarchy"
            >
              <EditorVisionHierarchyPanel
                hierarchy={displayHierarchy}
                selectedNodeId={selectedHierarchyNodeId}
                onSelectNode={selectHierarchyNode}
                showSourceDebug={isAdmin}
                taxonomyType={document.visionV6Meta?.taxonomyType}
              />
            </section>
          : null}
          {showParts && weakEstimatedOnly && !analysisPending ?
            <section
              className={`rounded-2xl border border-amber-200/80 bg-amber-50/95 p-4 text-amber-950 shadow-sm ${studioVisual.editorSurface}`}
              data-testid="instruction-parts-weak"
            >
              <h3 className="text-sm font-semibold text-amber-950">
                {t("editor.workflow.parts.weakTitle" as never)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                {t("editor.workflow.parts.weakLead" as never)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950"
                  onClick={() => void runEditorVisionAndObjectDetection(document).then(onDocumentChange)}
                >
                  {t("editor.workflow.parts.reanalyze" as never)}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950"
                  onClick={() => onPhaseChange?.("edit")}
                >
                  {t("editor.workflow.parts.manualSelect" as never)}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950"
                  onClick={() => onPhaseChange?.("director")}
                >
                  {t("editor.workflow.parts.describeAi" as never)}
                </button>
              </div>
            </section>
          : null}
          {showParts && !hasRichHierarchy && !analysisPending && !weakEstimatedOnly ?
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
          : null}
          {showStyle ?
            <EditorInstructionStyleTraitList
              document={document}
              styleTraitLabels={styleTraits}
              selectedAttribute={focusMode === "style" ? styleFocus : null}
              expandedAttribute={expandedStyleForPanel}
              onSelect={selectStyleAttribute}
              onToggleExpand={(attribute) =>
                setExpandedStyleAttribute((prev) => (prev === attribute ? null : attribute))
              }
            />
          : null}
          {isAdmin ?
            <>
              <section className="rounded-2xl border border-white/20 bg-[#041428]/70 p-3 text-[11px] text-white/90 backdrop-blur-sm">
                <p className="font-semibold text-white">
                  {t("editor.instructionStudio.v2.objectFeed.debugTitle" as never)}
                </p>
                <p>
                  {t("editor.instructionStudio.v2.objectFeed.source" as never)}: {objectFeedMeta.source}
                </p>
                <p>
                  {t("editor.instructionStudio.v2.objectFeed.count" as never)}: {objectFeedMeta.count}
                </p>
              </section>
              {analysisTimings.length ?
                <section
                  className="rounded-2xl border border-white/20 bg-[#041428]/70 p-3 text-[11px] text-white/90 backdrop-blur-sm"
                  data-testid="instruction-analysis-timings"
                >
                  <p className="font-semibold text-white">
                    {t("editor.workflow.parts.performanceTitle" as never)}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {analysisTimings.map((row) => (
                      <li key={`${row.stage}-${row.at}`}>
                        <span className="text-white/80">{row.stage}</span>
                        <span className="ml-2 font-mono text-emerald-200">{row.durationMs}ms</span>
                        {row.note ?
                          <span className="ml-1 text-white/60">({row.note})</span>
                        : null}
                      </li>
                    ))}
                  </ul>
                </section>
              : null}
            </>
          : null}
        </div>

        <div className="space-y-4 xl:col-span-5">
          {showObjectEdit && (activePhase === "director" ?
            <section className={`p-4 text-sm text-zinc-700 ${studioVisual.editorSurface}`}>
              <p className="font-semibold text-zinc-900">
                {t("editor.workflow.phase.directorHintTitle" as never)}
              </p>
              <p className="mt-1">{t("editor.workflow.phase.directorHintLead" as never)}</p>
            </section>
          : null)}
          {showObjectEdit && focusMode === "style" ?
            <EditorInstructionEditPanel
              mode="style"
              document={document}
              styleAttribute={styleFocus}
              selectedActionId={selectedStyleActionId}
              onActionIdChange={setSelectedStyleActionId}
              description={styleDescription}
              onDescriptionChange={setStyleDescription}
              onAddToChangePlan={handleAddStyleToChangePlan}
            />
          : null}
          {showObjectEdit && focusMode !== "style" && selectedObject ?
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
              estimatedSelection={selection.estimatedSelection}
              onExtractPart={handleExtractSelectedPart}
              selectedActionKey={
                selectedActionKey ||
                actionOptionKey(resolveDynamicActionsForObject(selectedObject)[0]!, 0)
              }
              onActionKeyChange={(key, option) => {
                setSelectedActionKey(key);
                updateSelection({
                  action: option.action,
                  customPrompt: option.promptHint ? `Focus on ${option.promptHint}` : undefined,
                  accessoryType: undefined,
                  replacement: undefined,
                });
              }}
            />
          : showObjectEdit ?
            <section className={`p-4 text-sm text-zinc-600 ${studioVisual.editorSurface}`}>
              {t("editor.instructionStudio.v2.workspace.selectObjectPrompt" as never)}
            </section>
          : null}

          {showChangePlan ?
            <EditorInstructionChangePlanPanel
              document={document}
              onDocumentChange={onDocumentChange}
              onGenerateFromPlan={() => void handleGenerateFromPlan()}
              generating={generating}
              onTargetOnlyChange={setTargetOnlyEdit}
            />
          : null}

          {showVariants ?
            <>
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
                <p className="text-sm text-zinc-600" role="status" data-testid="instruction-variant-status">
                  {statusMessage}
                </p>
              : null}

              <EditorVariantCallDebugPanel isAdmin={isAdmin} adminDebugExpanded />

              {showObjectEdit && selectedObject ?
                <EditorTargetPrecisionPanel
                  document={document}
                  selection={{ ...selection, color: colorInput || undefined }}
                  onTargetOnlyChange={setTargetOnlyEdit}
                />
              : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || generating || legacyReadOnly || !canGenerateVariant}
                  onClick={() => void handleGenerateVariant()}
                  className="min-h-11 flex-1 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  data-testid="instruction-generate-variant"
                  aria-disabled={busy || generating || legacyReadOnly || !canGenerateVariant}
                >
                  {t("editor.instructionStudio.generateVariant" as never)}
                </button>
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
              </div>
            </>
          : null}

          {showApprove && approvedActive?.approvalStatus === "approved" ?
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

          {showApprove ?
            <div className="flex flex-wrap gap-2">
              {previewVariant?.precisionWarning ?
                <div
                  className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  data-testid="instruction-variant-precision-warning"
                >
                  <p>
                    {previewVariant.precisionWarning === "low_precision"
                      ? t("editor.instructionStudio.v2.precision.lowPrecisionWarning" as never)
                      : t("editor.instructionStudio.v2.precision.driftWarning" as never)}
                  </p>
                  {previewVariant.precisionVerification?.changedRegionLabels?.length ?
                    <p className="mt-1 text-[11px] text-amber-800">
                      {t("editor.instructionStudio.v2.precision.changedRegions" as never, {
                        list: previewVariant.precisionVerification.changedRegionLabels.join(", "),
                      } as never)}
                    </p>
                  : null}
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
                    data-testid="instruction-regenerate-stronger-protection"
                    disabled={generating || legacyReadOnly}
                    onClick={() => void handleRegenerateWithStrongerProtection()}
                  >
                    {t("editor.instructionStudio.v2.precision.regenerateStronger" as never)}
                  </button>
                </div>
              : null}

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
              {motionUnlocked ?
                <>
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
                </>
              : null}
            </div>
          : null}
        </div>
      </div>

      {!showResults && document.instructionStudioState?.fusionPlan ?
        <EditorPlanSummaryPanel document={document} compact />
      : null}

      {showResults && (showVersions || showApprove) ?
        <>
          {motionUnlocked ?
            <EditorPostGenerationActionCenter document={document} resultType="image" />
          : null}
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
        </>
      : null}
    </div>
  );
}
