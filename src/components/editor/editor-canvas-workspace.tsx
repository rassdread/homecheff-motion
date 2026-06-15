"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { EditorAddPlacementPanel } from "@/components/editor/editor-add-placement-panel";
import { EditorAiSuggestions } from "@/components/editor/editor-ai-suggestions";
import { EditorAssetRecommendationsPanel } from "@/components/editor/editor-asset-recommendations-panel";
import { EditorVisionSummaryPanel } from "@/components/editor/editor-vision-summary-panel";
import { EditorBodyDesignerPanel } from "@/components/editor/editor-body-designer-panel";
import { EditorClickSegmentPrompt } from "@/components/editor/editor-click-segment-prompt";
import { EditorClickTraceDebugPanel } from "@/components/editor/editor-click-trace-debug-panel";
import { EditorCanvasPreview } from "@/components/editor/editor-canvas-preview";
import { EditorHumanObjectList } from "@/components/editor/editor-human-object-list";
import { EditorLayerTree } from "@/components/editor/editor-layer-tree";
import { EditorVisionHierarchyPanel } from "@/components/editor/editor-vision-hierarchy-panel";
import { EditorDetectionStatusBanner } from "@/components/editor/editor-detection-status-banner";
import { EditorVisionV6DebugPanel } from "@/components/editor/editor-vision-v6-debug-panel";
import { EditorMobileBottomSheet } from "@/components/editor/editor-mobile-bottom-sheet";
import { EditorObjectActionMenu } from "@/components/editor/editor-object-action-menu";
import { EditorPlacementPropertiesPanel } from "@/components/editor/editor-placement-properties-panel";
import { EditorPlacementQaPanel } from "@/components/editor/editor-placement-qa-panel";
import { EditorPropertiesPanel } from "@/components/editor/editor-properties-panel";
import { EditorDualComposerPanel } from "@/components/editor/editor-dual-composer-panel";
import { EditorExportHubPanel } from "@/components/editor/editor-export-hub-panel";
import { EditorAlignmentToolbar } from "@/components/editor/editor-alignment-toolbar";
import { EditorBackgroundToolsPanel } from "@/components/editor/editor-background-tools-panel";
import { EditorBrandKitPanel } from "@/components/editor/editor-brand-kit-panel";
import { EditorHandoffScorePanel } from "@/components/editor/editor-handoff-score-panel";
import { EditorLibraryDragPanel } from "@/components/editor/editor-library-drag-panel";
import { EditorMaskGateDialog } from "@/components/editor/editor-mask-gate-dialog";
import { EditorMagicReplacePanel } from "@/components/editor/editor-magic-replace-panel";
import { EditorMotionPreviewBar } from "@/components/editor/editor-motion-preview-bar";
import { EditorPosterBuilderPanel } from "@/components/editor/editor-poster-builder-panel";
import { EditorActionPlanPreview } from "@/components/editor/editor-action-plan-preview";
import { EditorAssistantSidebar } from "@/components/editor/editor-assistant-sidebar";
import { EditorContextualActionBar } from "@/components/editor/editor-contextual-action-bar";
import { EditorMagicEditBar } from "@/components/editor/editor-magic-edit-bar";
import { EditorQuickMotionPanel } from "@/components/editor/editor-quick-motion-panel";
import { EditorSocialKitPanel } from "@/components/editor/editor-social-kit-panel";
import { EditorReviewPanel } from "@/components/editor/editor-review-panel";
import { EditorRefinePointsPanel } from "@/components/editor/editor-refine-points-panel";
import type { PreciseSelectMode } from "@/components/editor/editor-precise-select-overlay";
import { EditorSelectionToolsPanel } from "@/components/editor/editor-selection-tools-panel";
import { EditorV2WorkflowShell } from "@/components/editor/editor-v2-workflow-shell";
import { EditorProjectNameDialog } from "@/components/editor/editor-project-name-dialog";
import { HcProjectDeleteDialog } from "@/components/projects/hc-project-delete-dialog";
import { HcProjectImportDialog } from "@/components/projects/hc-project-import-dialog";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { useRouter } from "next/navigation";
import { EditorVisualBodyPanel } from "@/components/editor/editor-visual-body-panel";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useHcProjectImportFlow } from "@/hooks/use-hc-project-import-flow";
import { useHcProjectTitleSync } from "@/hooks/use-hc-project-title-sync";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import {
  ensureHcProjectOnEditorOpen,
  isUntitledHcProjectName,
  readHcProjectWorkflowStatus,
  renameHcProjectForDocument,
  resolveHcProjectSaveMessageKey,
  saveEditorDocumentAsNewHcProject,
  saveEditorDocumentToHcProject,
} from "@/lib/hc-project-lifecycle";
import {
  archiveHcProjectRecord,
  hcProjectHasExportedResults,
  permanentlyDeleteHcProjectRecord,
  restoreHcProjectRecord,
} from "@/lib/hc-project-delete-archive";
import { exportHcProjectRecord } from "@/lib/hc-project-file-io";
import { dispatchHcProjectTitleChanged } from "@/lib/hc-project-title-sync";
import { exportEditorDocumentAsHcProject } from "@/lib/homecheff-project-export";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  applyEditorLayerOperation,
  markEditorDocumentDraftSaved,
  patchEditorLayerFields,
  patchEditorLayerTransform,
  redoEditorDocument,
  renameEditorLayerInDocument,
  reorderEditorLayerInDocument,
  saveEditorCanvasDocumentWithStatus,
  loadEditorCanvasDocument,
  buildEditorDownloadFilename,
  undoEditorDocument,
  runEditorVisionAndObjectDetection,
} from "@/lib/editor-canvas-session";
import { resetEditorAnalysisState } from "@/lib/editor-analysis-reset";
import { buildMotionReadyHrefFromEditorDocument } from "@/lib/motion-ready-character-routes";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import { editorCanRedo, editorCanUndo } from "@/lib/editor-non-destructive";
import { buildEditorCutoutAsset, upsertEditorCutoutAsset } from "@/lib/editor-cutout-layers";
import { findEditorObjectByLayerId } from "@/lib/editor-object-detection";
import { planEditorSmartRemove } from "@/lib/editor-smart-remove";
import { planEditorSmartReplace } from "@/lib/editor-smart-replace";
import {
  createDefaultHierarchicalSelection,
  enterPartSelectionMode,
  exitPartSelectionMode,
} from "@/lib/editor-hierarchical-selection";
import { savePartToLibrary } from "@/lib/editor-part-library";
import { partSupportsHierarchy } from "@/lib/editor-part-hierarchy";
import {
  executeEditorMaskedRemoveApi,
  executeEditorMaskedReplaceApi,
} from "@/lib/editor-vision-v3-client";
import { formatEditorCompositionGraphPreview } from "@/lib/editor-composition-graph";
import {
  addEditorPlacement,
  centerPlacementOnTarget,
  duplicateEditorPlacement,
  patchEditorPlacement,
  removeEditorPlacement,
  reorderEditorPlacementZIndex,
} from "@/lib/editor-placement-canvas";
import { exportEditorCanvasWithPlacements } from "@/lib/editor-placement-export";
import {
  documentSupportsBodyDesigner,
  inferEditorObjectType,
} from "@/lib/editor-body-designer";
import {
  defaultEditorUiMode,
  layerSupportsHumanBodyEdit,
  markEditorLayerAnimationReady,
  resolveEditorAiSuggestions,
  resolveEditorHumanActions,
  resolveEditorObjectKind,
  type EditorHumanActionId,
  type EditorUiMode,
} from "@/lib/editor-human-first";
import { shouldOpenClickSegmentPromptForLayer } from "@/lib/editor-canvas-click-routing";
import {
  applyEditorSelectionShape,
  applyRefinedPolygonToLayer,
  createMaskSelectionShape,
  detachObjectCutoutLayer,
} from "@/lib/editor-object-mask";
import {
  buildEditorMaskActionContext,
  editorMaskActionRequiresAiBackend,
} from "@/lib/editor-mask-actions";
import { syncDetectedObjectsOnDocument } from "@/lib/editor-object-detection";
import type { EditorShapePoint, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";
import {
  DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
  EDITOR_WORKSPACE_MODES,
  type EditorWorkspaceMode,
} from "@/types/homecheff-visual-editor";
import { openDualComposer } from "@/lib/editor-dual-composer";
import { buildEditorCommandPlan } from "@/lib/editor-v7-action-plan";
import {
  attachActivePlan,
  canRedoCommandHistory,
  canUndoCommandHistory,
  clearActivePlan,
  duplicateHistoryEntry,
  recordAppliedCommand,
  redoCommandHistory,
  rerunHistoryPrompt,
  toggleAssistantSidebar,
  undoCommandHistory,
} from "@/lib/editor-v7-command-history";
import { resolveContextualCommandSuggestions } from "@/lib/editor-v7-suggestions";
import { isBackgroundToolHidden } from "@/lib/editor-broken-features";
import { parseCompositorLayerId } from "@/lib/editor-compositor";
import { evaluateEditorMaskGate } from "@/lib/editor-mask-gate";
import { postEditorSegmentClick } from "@/lib/editor-segment-click-client";
import {
  EDITOR_SEGMENT_JOB_COLD_START_MS,
  pollEditorSegmentClickJob,
  startEditorSegmentClickJob,
} from "@/lib/editor-segment-click-job-client";
import { editorSegmentErrorMessageKey } from "@/lib/editor-segment-client-errors";
import {
  deriveSegmentationUiState,
  segmentationStateAllowsRetry,
  segmentationStateMessageKey,
} from "@/lib/editor-segmentation-state";
import {
  autoMaskProgressMessageKey,
  autoMaskUserMessageKey,
  pickAutoMaskStrategy,
  shouldAutoAcquireMask,
} from "@/lib/editor-auto-mask";
import {
  normalizeSelectLayerOptions,
  resolveAutoMaskClickPoint,
  type SelectLayerOptions,
} from "@/lib/editor-selection-pipeline";
import {
  applyEditorSegmentApiShape,
  type EditorSegmentApiShape,
} from "@/lib/editor-apply-segment-result";
import {
  applySegmentToSubObjectLayer,
  attachSubObjectLayer,
  createSubObjectLayer,
  resolveParentLayerAtClick,
  segmentPromptSuccessMessageKey,
} from "@/lib/editor-sub-object-layer";
import { EditorSelectionVerificationPanel } from "@/components/admin/editor-selection-verification-panel";
import { applyBackgroundRemovalResult, findPrimarySubjectLayer } from "@/lib/editor-background-remove";
import { useEditorProjectPersist } from "@/hooks/use-editor-project-persist";
import { saveEditorProject } from "@/lib/editor-project-client";
import { updateImportedLayer } from "@/lib/editor-imported-layers";
import { persistCutoutToLibrary } from "@/lib/editor-cutout-library-persist";
import { attachQuickMotionConfig } from "@/lib/editor-quick-gif";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  EDITOR_LEGACY_WORKSPACE_MODES,
  EDITOR_MODE_LABEL_KEYS,
  EDITOR_PRIMARY_WORKSPACE_MODES,
} from "@/lib/editor-workspace-modes";
import { resolveEditorWorkspaceMode } from "@/lib/editor-instruction-studio";
import type {
  EditorUxV7NoSelectionAction,
  EditorUxV7ObjectAction,
} from "@/lib/editor-ux-v7-contextual";
import {
  modeShowsAlignmentTools,
  modeShowsBrandKit,
  modeShowsComposePanels,
  modeShowsExportAdvancedPanels,
  modeShowsExportHub,
  modeShowsInstructionStudio,
  modeShowsLiveCanvasSelection,
  modeShowsQuickMotionPanel,
  modeShowsLibraryPanels,
  modeShowsMotionPreparePanels,
  modeShowsMotionPreviewBar,
  modeShowsPhotoEditObjectPanels,
  workspaceModeForNoSelectionAction,
} from "@/lib/editor-ux-v7-workspace";
import {
  editorAdminCanShowAiAnalysis,
  humanFirstObjectLabelKey,
  kindUsesSelectionTools,
  resolveContextualHumanActions,
  resolveHumanFirstObjectType,
} from "@/lib/editor-ux-cleanup";
import {
  alignDocumentLayer,
  distributeDocumentLayers,
} from "@/lib/editor-v6-alignment";
import { applyBackgroundToolIntent, backgroundToolPrompt } from "@/lib/editor-v6-background-tools";
import { defaultHomeCheffBrandKit, insertBrandKitItemOnCanvas } from "@/lib/editor-v6-brand-kit";
import { dropLibraryAssetOnCanvas, type LibraryDragPayload } from "@/lib/editor-v6-library-drag";
import { applyPosterTemplate } from "@/lib/editor-v6-poster-builder";
import { applySocialPreset } from "@/lib/editor-v6-social-kit";
import { attachMotionPreview } from "@/lib/editor-v6-motion-preview";
import {
  applySegmentCutoutToDocument,
  planOneClickCutout,
} from "@/lib/editor-v6-one-click-cutout";
import type {
  EditorAlignmentAction,
  EditorBackgroundToolId,
  EditorPosterTemplate,
  EditorSocialPreset,
  EditorV6MotionPreviewPreset,
  EditorV7CommandPlan,
  EditorV7CommandPlanStep,
} from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onBack: () => void;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorObjectOperation,
  EditorPlacementItem,
} from "@/types/homecheff-visual-editor";

type PanelMode = "layer" | "placement" | "body";

const EDITOR_MODE_ALREADY_ACTIVE_KEYS: Record<EditorWorkspaceMode, string> = {
  instruction_studio: "editor.modeAlreadyActive.instructionStudio",
  photo_edit: "editor.modeAlreadyActive.photoEdit",
  compose: "editor.modeAlreadyActive.compose",
  quick_motion: "editor.modeAlreadyActive.gif",
  export: "editor.modeAlreadyActive.export",
};

export function EditorCanvasWorkspace({ document, onBack, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const isAdmin = session.user?.role === "admin";
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    document.objects.find((o) => o.layerType !== "background")?.id ?? null
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("layer");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nameDialogMode, setNameDialogMode] = useState<"save" | "rename" | "save-as-new">("save");
  const [showAddPlacement, setShowAddPlacement] = useState(false);
  const [customTarget, setCustomTarget] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"target" | "properties" | "add" | null>(null);
  const [replacePlacementId, setReplacePlacementId] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [uiMode, setUiMode] = useState<EditorUiMode>(defaultEditorUiMode());
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showVisualBody, setShowVisualBody] = useState(false);
  const [lassoActive, setLassoActive] = useState(false);
  const [refiningSelection, setRefiningSelection] = useState(false);
  const [sam2Available, setSam2Available] = useState<boolean | null>(null);
  const [rembgAvailable, setRembgAvailable] = useState(false);
  const [replicateAvailable, setReplicateAvailable] = useState(false);
  const [autoMaskProviderAvailable, setAutoMaskProviderAvailable] = useState(false);
  const [clickSegmentPoint, setClickSegmentPoint] = useState<EditorShapePoint | null>(null);
  const [clickSegmentParentLayerId, setClickSegmentParentLayerId] = useState<string | null>(null);
  const [clickSegmentBusy, setClickSegmentBusy] = useState(false);
  const [segmentFailureCode, setSegmentFailureCode] = useState<string | null>(null);
  const [lastClickFeedbackPoint, setLastClickFeedbackPoint] = useState<EditorShapePoint | null>(
    null
  );
  const [clickDebugHandler, setClickDebugHandler] = useState<string | null>(null);
  const [clickDebugApiStatus, setClickDebugApiStatus] = useState<string | null>(null);
  const [clickDebugPickedLayerId, setClickDebugPickedLayerId] = useState<string | null>(null);
  const [segmentCanvasMessageKey, setSegmentCanvasMessageKey] = useState<string | null>(null);
  const [activeSegmentJobId, setActiveSegmentJobId] = useState<string | null>(null);
  const bootstrapKeyRef = useRef<string | null>(null);
  const photoEditPanelRef = useRef<HTMLDivElement>(null);
  const exportPanelRef = useRef<HTMLDivElement>(null);
  const composePanelRef = useRef<HTMLDivElement>(null);
  const quickMotionPanelRef = useRef<HTMLDivElement>(null);
  const autoMaskInFlightRef = useRef<string | null>(null);
  const [preciseSelectActive, setPreciseSelectActive] = useState(false);
  const [preciseSelectMode, setPreciseSelectMode] = useState<PreciseSelectMode>("initial");
  const [sam2PositivePoints, setSam2PositivePoints] = useState<EditorShapePoint[]>([]);
  const [sam2NegativePoints, setSam2NegativePoints] = useState<EditorShapePoint[]>([]);
  const [sam2RefineVisible, setSam2RefineVisible] = useState(false);
  const [motionPreviewEnabled, setMotionPreviewEnabled] = useState(false);
  const [advancedExportOpen, setAdvancedExportOpen] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [v6Busy, setV6Busy] = useState(false);
  const [showMagicReplace, setShowMagicReplace] = useState(false);
  const [maskGateOpen, setMaskGateOpen] = useState(false);
  const [selectedCompositorId, setSelectedCompositorId] = useState<string | null>(null);
  const [composerUploading, setComposerUploading] = useState(false);
  const composerSourceRef = useRef<HTMLInputElement>(null);

  const workspaceMode: EditorWorkspaceMode = resolveEditorWorkspaceMode(document);
  const instructionStudioActive = modeShowsInstructionStudio(workspaceMode);
  const liveCanvasSelectionEnabled = modeShowsLiveCanvasSelection(workspaceMode);
  const visibleWorkspaceModes =
    uiMode === "advanced" ? EDITOR_WORKSPACE_MODES : EDITOR_PRIMARY_WORKSPACE_MODES;

  const hierarchicalSelection =
    document.hierarchicalSelection ?? createDefaultHierarchicalSelection();
  const selectedPartId = hierarchicalSelection.selectedPartId;

  useEffect(() => {
    void fetch("/api/editor/segment/status")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            sam2PreciseSelection?: string;
            rembgAvailable?: boolean;
            replicateSam3Available?: boolean;
            autoMaskProviderAvailable?: boolean;
          } | null
        ) => {
          setSam2Available(data?.sam2PreciseSelection === "available");
          setRembgAvailable(Boolean(data?.rembgAvailable));
          setReplicateAvailable(Boolean(data?.replicateSam3Available));
          setAutoMaskProviderAvailable(Boolean(data?.autoMaskProviderAvailable));
        }
      )
      .catch(() => setSam2Available(false));
  }, []);

  useEffect(() => {
    const bootstrapKey = `${document.sessionId}::${document.backgroundUrl}`;
    if (bootstrapKeyRef.current === bootstrapKey) {
      return;
    }
    if (!documentNeedsDetectionBootstrap(document)) {
      bootstrapKeyRef.current = bootstrapKey;
      return;
    }
    bootstrapKeyRef.current = bootstrapKey;
    void (async () => {
      const analyzed = await runEditorVisionAndObjectDetection(document);
      onDocumentChange(analyzed);
      const firstObject = analyzed.objects.find((o) => o.layerType !== "background");
      if (firstObject) {
        setSelectedLayerId(firstObject.id);
      }
      if (analyzed.detectionMeta?.userMessageKey) {
        setSaveMessage(t(analyzed.detectionMeta.userMessageKey as never));
      }
    })();
  }, [document.sessionId, document.backgroundUrl]);

  useEffect(() => {
    setSelectedLayerId(document.objects.find((o) => o.layerType !== "background")?.id ?? null);
    setSelectedPlacementId(null);
  }, [document.sessionId, document.backgroundUrl]);

  useEffect(() => {
    if (document.instructionStudioState?.hcProjectId) {
      return;
    }
    const linked = ensureHcProjectOnEditorOpen({
      document,
      ownerId: session.user?.id,
      syncToServer: false,
    });
    if (linked.instructionStudioState?.hcProjectId !== document.instructionStudioState?.hcProjectId) {
      onDocumentChange(linked);
    }
  }, [document.sessionId, document.instructionStudioState?.hcProjectId, onDocumentChange, session.user?.id]);

  const { persistNow: persistProjectNow } = useEditorProjectPersist({
    document,
    enabled: Boolean(session.user),
  });

  const selectedLayer = useMemo(
    () => document.objects.find((o) => o.id === selectedLayerId) ?? null,
    [document.objects, selectedLayerId]
  );
  const selectedPlacement = useMemo(
    () => document.placements.find((p) => p.id === selectedPlacementId) ?? null,
    [document.placements, selectedPlacementId]
  );
  const objectType = inferEditorObjectType(document);
  const supportsBodyDesigner = documentSupportsBodyDesigner(document);
  const bodyDesigner = document.bodyDesigner ?? DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS;

  const persist = (next: EditorCanvasDocument) => {
    const { document: saved, storageWarning } = saveEditorCanvasDocumentWithStatus(next);
    onDocumentChange(saved);
    if (storageWarning === "quota_exceeded") {
      setSaveMessage(t("editor.storage.quotaPartialSave" as never));
    }
    return saved;
  };

  const scrollToPanelRef = (ref: RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setWorkspaceMode = (mode: EditorWorkspaceMode, options?: { scroll?: boolean }) => {
    let next: EditorCanvasDocument = { ...document, workspaceMode: mode };
    if (mode === "quick_motion" && !next.quickMotionConfig) {
      next = attachQuickMotionConfig(next, {});
    }
    persist(next);
    if (options?.scroll) {
      if (mode === "photo_edit") {
        scrollToPanelRef(photoEditPanelRef);
      } else if (mode === "compose") {
        scrollToPanelRef(composePanelRef);
      } else if (mode === "quick_motion") {
        scrollToPanelRef(quickMotionPanelRef);
      } else if (mode === "export") {
        scrollToPanelRef(exportPanelRef);
      }
    }
  };

  const reportSegmentFailure = (code?: string) => {
    setSegmentFailureCode(code ?? "segmentation_internal_error");
    setSaveMessage(t(editorSegmentErrorMessageKey(code) as never));
  };

  const clearSegmentFailure = () => setSegmentFailureCode(null);

  const segmentationUiState = deriveSegmentationUiState({
    clickSegmentPoint,
    clickSegmentBusy,
    refiningSelection,
    selectedLayer,
    lastFailureCode: segmentFailureCode,
  });
  const segmentationStatusKey = segmentationStateMessageKey(segmentationUiState);

  const handleComposerSourceUpload = async (file: File) => {
    setComposerUploading(true);
    try {
      const uploaded = await uploadEditorSourceImage(file);
      persist(
        openDualComposer(document, {
          imageUrl: uploaded.workingImageUrl,
          storageKey: uploaded.workingStorageKey,
          name: file.name.replace(/\.[^.]+$/, ""),
        })
      );
    } finally {
      setComposerUploading(false);
    }
  };

  const tryAutoAcquireMask = async (
    layer: NonNullable<typeof selectedLayer>,
    userClickPoint?: EditorShapePoint | null
  ) => {
    if (!shouldAutoAcquireMask(layer) || autoMaskInFlightRef.current === layer.id) {
      return;
    }
    const strategy = pickAutoMaskStrategy(
      replicateAvailable,
      sam2Available === true,
      rembgAvailable
    );
    setSaveMessage(t(autoMaskProgressMessageKey("selecting") as never));
    if (strategy === "none") {
      setSaveMessage(t(autoMaskProgressMessageKey("unavailable") as never));
      return;
    }
    autoMaskInFlightRef.current = layer.id;
    setRefiningSelection(true);
    setSaveMessage(t(autoMaskProgressMessageKey("refining") as never));
    try {
      if (strategy === "replicate" || strategy === "sam2") {
        const clickPoint = resolveAutoMaskClickPoint(layer, userClickPoint);
        const { response: res } = await postEditorSegmentClick({
          imageUrl: document.backgroundUrl,
          backgroundStorageKey: document.backgroundStorageKey,
          clickPoint,
          targetBounds: layer.bounds,
          objectHint: layer.label,
          category: layer.category,
          semanticType: layer.semanticType,
          label: layer.label,
          editorObjectId: layer.id,
          sessionId: document.sessionId,
          createCutout: true,
        });
        setClickDebugApiStatus(`segment/click ${res.status}`);
        if (res.ok) {
          clearSegmentFailure();
          const result = (await res.json()) as EditorSegmentApiShape;
          applySegmentShapeToLayer(result, layer.id, layer);
          setSaveMessage(t(autoMaskUserMessageKey(strategy, true) as never));
          return;
        }
        const err = (await res.json().catch(() => null)) as { code?: string } | null;
        reportSegmentFailure(err?.code);
        return;
      }
      if (strategy === "rembg") {
        const res = await fetch("/api/editor/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: document.backgroundUrl,
            sessionId: document.sessionId,
            mode: "refine",
            targetBounds: layer.bounds,
          }),
        });
        if (res.ok) {
          const result = (await res.json()) as {
            maskUrl?: string;
            cutoutUrl?: string;
            polygon: EditorShapePoint[];
            boundingBox: { x: number; y: number; width: number; height: number };
            confidence: number;
            segmentationSource: "rembg" | "heuristic";
          };
          const shape = createMaskSelectionShape({
            bounds: result.boundingBox,
            maskUrl: result.maskUrl,
            cutoutUrl: result.cutoutUrl,
            polygon: result.polygon,
            confidence: result.confidence,
            segmentationSource: result.segmentationSource,
          });
          let next = applyEditorSelectionShape(layer, shape);
          if (result.cutoutUrl) {
            next = detachObjectCutoutLayer(next, result.cutoutUrl, result.maskUrl);
          }
          persist(patchEditorLayerFields(document, layer.id, next));
          setSaveMessage(t(autoMaskUserMessageKey("rembg", Boolean(result.maskUrl)) as never));
          return;
        }
      }
      setSaveMessage(t(autoMaskUserMessageKey(strategy, false) as never));
    } catch {
      setSaveMessage(t(autoMaskUserMessageKey(strategy, false) as never));
    } finally {
      setRefiningSelection(false);
      autoMaskInFlightRef.current = null;
    }
  };

  const selectLayer = (
    layerId: string,
    options?: SelectLayerOptions | string | null
  ) => {
    const { partId, clickPoint } = normalizeSelectLayerOptions(options);
    let nextDocument = document;
    const rootObject = (document.detectedObjects ?? []).find((o) => o.layerId === layerId);
    const current = document.hierarchicalSelection ?? createDefaultHierarchicalSelection();

    if (rootObject) {
      if (partId) {
        const hierarchy = document.objectHierarchies?.[rootObject.id];
        const part = hierarchy?.parts.find((p) => p.id === partId);
        nextDocument = {
          ...document,
          hierarchicalSelection: {
            mode: "part",
            rootObjectId: rootObject.id,
            selectedPartId: partId,
          },
        };
        if (part) {
          setSaveMessage(t("editor.visionV4.partSelected" as never, { name: part.label }));
        }
      } else if (
        current.rootObjectId === rootObject.id &&
        current.mode === "object" &&
        partSupportsHierarchy(rootObject)
      ) {
        nextDocument = {
          ...document,
          hierarchicalSelection: enterPartSelectionMode(current, rootObject.id),
        };
        setSaveMessage(t("editor.visionV4.partModeHint" as never));
      } else {
        nextDocument = {
          ...document,
          hierarchicalSelection: {
            mode: "object",
            rootObjectId: rootObject.id,
            selectedPartId: null,
          },
        };
      }
      if (nextDocument !== document) {
        nextDocument = persist(nextDocument);
      }
    }

    setSelectedLayerId(layerId);
    setSelectedPlacementId(null);
    setPanelMode("layer");
    setCustomTarget(false);
    if (uiMode === "visual") {
      setShowActionMenu(true);
    }

    const layer = nextDocument.objects.find((o) => o.id === layerId) ?? null;
    if (clickPoint) {
      setLastClickFeedbackPoint(clickPoint);
      setClickDebugPickedLayerId(layerId);
    }
    if (
      clickPoint &&
      layer &&
      uiMode === "visual" &&
      shouldOpenClickSegmentPromptForLayer(layer)
    ) {
      setClickDebugHandler("selectLayer→openClickSegmentPrompt");
      openClickSegmentPrompt(clickPoint, layer.id);
      return;
    }
    if (layer && shouldAutoAcquireMask(layer)) {
      setClickDebugHandler("selectLayer→tryAutoAcquireMask");
      void tryAutoAcquireMask(layer, clickPoint);
    } else if (layer) {
      setClickDebugHandler("selectLayer→selectOnly");
      setSaveMessage(t(autoMaskProgressMessageKey("selecting") as never));
    }
  };

  const selectVisionHierarchyNode = (node: EditorVisionHierarchyNode) => {
    if (node.layerId) {
      const rootObject = node.objectId
        ? (document.detectedObjects ?? []).find((o) => o.id === node.objectId)
        : (document.detectedObjects ?? []).find((o) => o.layerId === node.layerId);
      if (node.partId && rootObject) {
        selectLayer(rootObject.layerId, node.partId);
        return;
      }
      selectLayer(node.layerId);
      return;
    }
    if (node.partId && node.objectId) {
      const root = (document.detectedObjects ?? []).find((o) => o.id === node.objectId);
      if (root) {
        selectLayer(root.layerId, node.partId);
      }
      return;
    }
    if (node.layerId) {
      selectLayer(node.layerId);
    }
  };

  const createClickPickLayer = (point: EditorShapePoint, label: string): EditorCanvasLayer => {
    const size = 0.2;
    const bounds = {
      x: Math.max(0, Math.min(1 - size, point.x - size / 2)),
      y: Math.max(0, Math.min(1 - size, point.y - size / 2)),
      width: size,
      height: size,
    };
    return {
      id: `click_pick_${Date.now()}`,
      label,
      sourceKind: document.sourceKind,
      assetId: document.sourceAssetId,
      storageKey: document.backgroundStorageKey ?? "",
      previewUrl: document.backgroundUrl,
      transform: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        scale: 1,
        rotation: 0,
      },
      locked: false,
      visible: true,
      bounds,
      layerType: "semantic",
      confidence: 0.65,
      semanticType: "object",
      category: "prop",
      layerSource: "manual",
      editable: true,
      metadata: { bootstrapRegion: true, approximateSelection: true },
    };
  };

  const addClickPickLayer = (point: EditorShapePoint, label: string) => {
    const layer = createClickPickLayer(point, label);
    const objects = [...document.objects, layer];
    const detectedObjects = syncDetectedObjectsOnDocument(objects, document.detectedObjects);
    const next = persist({
      ...document,
      objects,
      detectedObjects,
    });
    selectLayer(layer.id, { clickPoint: point });
    return next.objects.find((o) => o.id === layer.id) ?? layer;
  };

  const openClickSegmentPrompt = (point: EditorShapePoint, parentLayerId?: string | null) => {
    setClickSegmentPoint(point);
    setClickSegmentParentLayerId(parentLayerId ?? null);
    setLastClickFeedbackPoint(point);
  };

  const dismissClickSegmentPrompt = () => {
    setClickSegmentPoint(null);
    setClickSegmentParentLayerId(null);
  };

  const handleEmptyCanvasClick = (point: EditorShapePoint) => {
    setClickDebugHandler("emptyCanvasClick→openClickSegmentPrompt");
    setClickDebugPickedLayerId(null);
    openClickSegmentPrompt(point);
  };

  const handleApproximateLayerClick = (point: EditorShapePoint, parentLayerId: string) => {
    setClickDebugHandler("approximateLayerClick→openClickSegmentPrompt");
    setClickDebugPickedLayerId(parentLayerId);
    openClickSegmentPrompt(point, parentLayerId);
  };

  const runPromptSubLayerSegmentation = async (input: {
    point: EditorShapePoint;
    prompt: string;
    parentLayerId: string | null;
    labelOverride?: string;
  }) => {
    if (!autoMaskProviderAvailable && !replicateAvailable) {
      setSaveMessage(t("editor.clickSegment.providerUnavailable" as never));
      return;
    }

    const clearSegmentJobUi = () => {
      setActiveSegmentJobId(null);
      setSegmentCanvasMessageKey(null);
    };

    setRefiningSelection(true);
    try {
      const parentLayer =
        input.parentLayerId ?
          (document.objects.find((o) => o.id === input.parentLayerId) ?? null)
        : resolveParentLayerAtClick(
            document.objects,
            input.point,
            document.detectedObjects ?? []
          );

      const childStub = createSubObjectLayer({
        point: input.point,
        prompt: input.prompt,
        sourceKind: document.sourceKind,
        sourceAssetId: document.sourceAssetId,
        backgroundStorageKey: document.backgroundStorageKey,
        backgroundUrl: document.backgroundUrl,
        parentLayer,
        labelOverride: input.labelOverride,
      });

      setClickDebugHandler(`runPromptSubLayerSegmentation(${input.prompt})→async`);
      setSegmentCanvasMessageKey("editor.segmentJob.running");
      const started = await startEditorSegmentClickJob({
        imageUrl: document.backgroundUrl,
        backgroundStorageKey: document.backgroundStorageKey,
        clickPoint: input.point,
        objectHint: input.prompt,
        targetBounds: parentLayer?.bounds,
        editorObjectId: childStub.id,
        parentLayerId: parentLayer?.id,
        sessionId: document.sessionId,
        createCutout: true,
      });
      if (!started.ok) {
        reportSegmentFailure(started.code);
        setClickDebugApiStatus(`start failed ${started.code ?? ""}`);
        return;
      }
      setActiveSegmentJobId(started.jobId);
      setClickDebugApiStatus(`job queued ${started.jobId}`);

      const polled = await pollEditorSegmentClickJob(started.jobId, {
        onStatus: (status, elapsedMs) => {
          setClickDebugApiStatus(`job ${status.status} ${elapsedMs}ms`);
          if (
            elapsedMs >= EDITOR_SEGMENT_JOB_COLD_START_MS &&
            (status.status === "queued" || status.status === "running")
          ) {
            setSegmentCanvasMessageKey("editor.segmentJob.coldStart");
          } else if (status.status === "queued" || status.status === "running") {
            setSegmentCanvasMessageKey("editor.segmentJob.running");
          }
        },
      });
      if (!polled.ok) {
        reportSegmentFailure(polled.code);
        setClickDebugApiStatus(
          `job ${polled.timedOut ? "client_timeout" : polled.code ?? "failed"}`
        );
        return;
      }

      const result = polled.result;
      if (!result.maskUrl) {
        reportSegmentFailure("replicate_prediction_failed");
        return;
      }

      clearSegmentFailure();
      setClickDebugApiStatus(`job ready mask=${Boolean(result.maskUrl)}`);
      const withSegment = applySegmentToSubObjectLayer(
        childStub,
        result as EditorSegmentApiShape
      );
      const objects = attachSubObjectLayer(document.objects, withSegment);
      const detectedObjects = syncDetectedObjectsOnDocument(objects, document.detectedObjects);
      persist({
        ...document,
        objects,
        detectedObjects,
        hierarchicalSelection: {
          mode: "object",
          rootObjectId: `obj_${withSegment.id}`,
          selectedPartId: null,
        },
      });
      setSelectedLayerId(withSegment.id);
      setSaveMessage(t(segmentPromptSuccessMessageKey(input.prompt) as never));
      return withSegment;
    } catch {
      reportSegmentFailure("segmentation_internal_error");
    } finally {
      clearSegmentJobUi();
      setRefiningSelection(false);
    }
  };

  const handleClickSegmentObject = async () => {
    if (!clickSegmentPoint) {
      return;
    }
    setClickSegmentBusy(true);
    const point = clickSegmentPoint;
    const parentLayerId = clickSegmentParentLayerId;
    dismissClickSegmentPrompt();
    try {
      await runPromptSubLayerSegmentation({
        point,
        prompt: "object",
        parentLayerId,
        labelOverride: t("editor.clickSegment.pickLabel" as never),
      });
    } catch {
      setSaveMessage(t("editor.clickSegment.failed" as never));
    } finally {
      setClickSegmentBusy(false);
    }
  };

  const handleClickSegmentPrompt = async (prompt: string) => {
    if (!clickSegmentPoint) {
      return;
    }
    setClickSegmentBusy(true);
    const point = clickSegmentPoint;
    const parentLayerId = clickSegmentParentLayerId;
    dismissClickSegmentPrompt();
    try {
      await runPromptSubLayerSegmentation({ point, prompt, parentLayerId });
    } catch {
      setSaveMessage(t("editor.clickSegment.failed" as never));
    } finally {
      setClickSegmentBusy(false);
    }
  };

  const handleClickSegmentOutline = () => {
    dismissClickSegmentPrompt();
    setLassoActive(true);
  };

  const handleSavePartToLibrary = () => {
    if (!hierarchicalSelection.rootObjectId || !selectedPartId) {
      return;
    }
    persist(savePartToLibrary(document, hierarchicalSelection.rootObjectId, selectedPartId));
    setSaveMessage(t("editor.visionV4.partSaved" as never));
  };

  const handleExitPartMode = () => {
    persist({
      ...document,
      hierarchicalSelection: exitPartSelectionMode(hierarchicalSelection),
    });
    setMotionPreviewEnabled(false);
  };

  const selectPlacement = (placementId: string) => {
    setSelectedPlacementId(placementId);
    setPanelMode("placement");
  };

  const runMaskedEdit = async (
    operation: "delete" | "replace",
    layer: EditorCanvasLayer,
    prompt?: string,
    replacementImageUrl?: string
  ) => {
    const plan =
      operation === "delete"
        ? planEditorSmartRemove(layer)
        : planEditorSmartReplace({ layer, prompt, replacementImageUrl });
    const maskUrl = plan.maskUrl;
    if (!maskUrl || !plan.ready) {
      setSaveMessage(plan.message);
      return;
    }

    setSaving(true);
    setSaveMessage(
      operation === "delete"
        ? t("editor.visionV3.removing" as never)
        : t("editor.visionV3.replacing" as never)
    );

    try {
      const api =
        operation === "delete"
          ? await executeEditorMaskedRemoveApi({
              sessionId: document.sessionId,
              layerId: layer.id,
              imageUrl: document.backgroundUrl,
              maskUrl,
              objectLabel: layer.label,
              backgroundStorageKey: document.backgroundStorageKey,
            })
          : await executeEditorMaskedReplaceApi({
              sessionId: document.sessionId,
              layerId: layer.id,
              imageUrl: document.backgroundUrl,
              maskUrl,
              objectLabel: layer.label,
              prompt: prompt?.trim() || `Replace ${layer.label} with an improved version`,
              backgroundStorageKey: document.backgroundStorageKey,
            });

      if (!api.ok || !api.resultUrl) {
        setSaveMessage(api.error ?? plan.message);
        return;
      }

      const editJobs = [...(document.editJobs ?? []), api.job];
      let next = resetEditorAnalysisState(
        {
          ...document,
          backgroundUrl: api.resultUrl,
          editJobs,
          updatedAt: new Date().toISOString(),
        },
        { preserveInstructionWorkflow: true }
      );

      if (operation === "delete") {
        next = applyEditorLayerOperation(next, layer.id, "delete");
      }

      bootstrapKeyRef.current = null;
      const analyzed = await runEditorVisionAndObjectDetection(next);
      persist(analyzed);
      setSelectedLayerId(analyzed.objects.find((o) => o.layerType !== "background")?.id ?? null);
      setSaveMessage(
        operation === "delete"
          ? t("editor.visionV3.removeSuccess" as never)
          : t("editor.visionV3.replaceSuccess" as never)
      );
    } catch {
      setSaveMessage(t("editor.visionV3.editFailed" as never));
    } finally {
      setSaving(false);
    }
  };

  const handleOperation = (operation: EditorObjectOperation) => {
    if (!selectedLayerId) {
      return;
    }
    const layer = document.objects.find((o) => o.id === selectedLayerId) ?? null;
    const maskContext = buildEditorMaskActionContext(layer, operation);

    if ((operation === "delete" || operation === "replace") && layer) {
      const gate = evaluateEditorMaskGate(layer);
      if (!gate.allowed) {
        setMaskGateOpen(true);
        setSaveMessage(t(gate.reasonKey ?? "editor.maskGate.needRefine"));
        return;
      }
      if (operation === "delete") {
        void runMaskedEdit("delete", layer);
        return;
      }
      if (operation === "replace") {
        setShowMagicReplace(true);
        return;
      }
    }

    if (operation === "replace" && layer) {
      const plan = planEditorSmartReplace({ layer });
      setSaveMessage(
        editorMaskActionRequiresAiBackend(layer, operation)
          ? t("editor.sam2.actionAiVariant")
          : plan.message
      );
    } else if (operation === "delete" && layer) {
      const plan = planEditorSmartRemove(layer);
      setSaveMessage(
        editorMaskActionRequiresAiBackend(layer, operation)
          ? t("editor.sam2.actionAiVariant")
          : plan.message
      );
    } else if (maskContext?.usesMask && (operation === "delete" || operation === "replace")) {
      setSaveMessage(t("editor.mask.actionUsesShape" as never));
    }
    const next = applyEditorLayerOperation(document, selectedLayerId, operation);
    persist(next);
    if (operation === "delete") {
      setSelectedLayerId(next.objects.find((o) => o.layerType !== "background")?.id ?? null);
    }
  };

  const handleSaveProject = async (title?: string) => {
    setSaving(true);
    const payload = buildEditorSavePayload(document);
    const hadProject = Boolean(document.instructionStudioState?.hcProjectId);
    const saved = markEditorDocumentDraftSaved(document);
    const { document: linked, project } = saveEditorDocumentToHcProject({
      document: saved,
      ownerId: session.user?.id,
      title,
      workflowStatus: hadProject ? "in_progress" : "concept",
      syncToServer: Boolean(session.user),
    });
    persist(linked);
    if (session.user) {
      const result = await saveEditorProject(linked.sessionId, linked, linked.name);
      if (!result.ok) {
        setSaveMessage(t("hcProject.save.failed" as never));
        setSaving(false);
        return;
      }
    }
    const messageKey = resolveHcProjectSaveMessageKey({
      workflowStatus: readHcProjectWorkflowStatus(project),
      created: !hadProject,
    });
    setSaveMessage(
      t(messageKey as never, {
        layers: String(payload.semanticLayers.filter((l) => l.type !== "background").length),
        placements: String(payload.placementCount),
        name: project.title,
      })
    );
    setSaving(false);
  };

  const requestSaveProject = () => {
    if (isUntitledHcProjectName(document.name)) {
      setNameDialogMode("save");
      setNameDialogOpen(true);
      return;
    }
    void handleSaveProject();
  };

  const requestRenameProject = () => {
    setNameDialogMode("rename");
    setNameDialogOpen(true);
  };

  const requestSaveAsNewProject = () => {
    setNameDialogMode("save-as-new");
    setNameDialogOpen(true);
  };

  const handleOpenInProjects = () => {
    const projectId = document.instructionStudioState?.hcProjectId;
    if (projectId) {
      router.push(`/projects?highlight=${encodeURIComponent(projectId)}`);
      return;
    }
    router.push("/projects");
  };

  const linkedHcProject = useMemo(() => {
    const projectId = document.instructionStudioState?.hcProjectId;
    return projectId ? loadHomeCheffProject(projectId) : null;
  }, [document.instructionStudioState?.hcProjectId]);

  useHcProjectTitleSync(document.instructionStudioState?.hcProjectId, (next) => {
    if (document.name === next.title) {
      return;
    }
    persist({ ...document, name: next.title });
  });

  const isLinkedProjectArchived = linkedHcProject
    ? linkedHcProject.isArchived || readHcProjectWorkflowStatus(linkedHcProject) === "archived"
    : false;

  const handleArchiveLinkedProject = () => {
    const projectId = document.instructionStudioState?.hcProjectId;
    if (!projectId) {
      return;
    }
    archiveHcProjectRecord(projectId, { syncToServer: Boolean(session.user) });
    setSaveMessage(t("hcProject.archive.archived" as never));
  };

  const handleRestoreLinkedProject = () => {
    const projectId = document.instructionStudioState?.hcProjectId;
    if (!projectId) {
      return;
    }
    restoreHcProjectRecord(projectId, { syncToServer: Boolean(session.user) });
    setSaveMessage(t("hcProject.archive.restored" as never));
  };

  const handleDeleteLinkedProject = () => {
    if (document.instructionStudioState?.hcProjectId) {
      setDeleteDialogOpen(true);
    }
  };

  const confirmDeleteLinkedProject = () => {
    const projectId = document.instructionStudioState?.hcProjectId;
    if (!projectId) {
      return;
    }
    permanentlyDeleteHcProjectRecord(projectId);
    persist({
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        hcProjectId: undefined,
      },
    });
    setDeleteDialogOpen(false);
    onBack();
  };

  const importFlow = useHcProjectImportFlow({
    targetService: "editor",
  });

  const handleDownloadProjectFile = () => {
    if (linkedHcProject) {
      exportHcProjectRecord(linkedHcProject);
    } else {
      exportEditorDocumentAsHcProject({
        document,
        ownerId: session.user?.id,
        existingProjectId: document.instructionStudioState?.hcProjectId,
        syncToServer: Boolean(session.user),
      });
    }
    setSaveMessage(t("hcProject.file.exportStarted" as never));
  };

  const handleNameDialogConfirm = async (name: string) => {
    setNameDialogOpen(false);
    if (nameDialogMode === "rename") {
      setSaving(true);
      const { document: renamed, project } = renameHcProjectForDocument({
        document,
        title: name,
        ownerId: session.user?.id,
        syncToServer: Boolean(session.user),
      });
      if (!project) {
        setSaving(false);
        return;
      }
      dispatchHcProjectTitleChanged(project);
      persist(renamed);
      setSaveMessage(t("hcProject.save.nameUpdated" as never, { name: project.title }));
      setSaving(false);
      return;
    }
    if (nameDialogMode === "save-as-new") {
      setSaving(true);
      const { document: copied, project } = saveEditorDocumentAsNewHcProject({
        document,
        ownerId: session.user?.id,
        title: name,
        syncToServer: Boolean(session.user),
      });
      persist(copied);
      setSaveMessage(t("hcProject.save.addedToProjects" as never, { name: project.title }));
      setSaving(false);
      return;
    }
    await handleSaveProject(name);
  };

  const handleSaveDraft = () => {
    requestSaveProject();
  };

  const handleDownload = async () => {
    const exported = await exportEditorCanvasWithPlacements(document);
    if (exported.dataUrl) {
      const link = window.document.createElement("a");
      link.href = exported.dataUrl;
      link.download = buildEditorDownloadFilename(document).replace(/\.png$/, "-composed.png");
      link.click();
      setSaveMessage(t(exported.messageKey as never));
      return;
    }
    const link = window.document.createElement("a");
    link.href = document.backgroundUrl;
    link.download = buildEditorDownloadFilename(document);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    setSaveMessage(t(exported.messageKey as never));
  };

  const handleAddPlacement = (placement: EditorPlacementItem) => {
    persist(addEditorPlacement(document, placement));
    setSelectedPlacementId(placement.id);
    setPanelMode("placement");
    setReplacePlacementId(null);
  };

  const handleDeletePlacement = () => {
    if (!selectedPlacementId) {
      return;
    }
    const placement = document.placements.find((p) => p.id === selectedPlacementId);
    if (placement?.canvasLocked && !window.confirm(t("editor.placement.deleteConfirm"))) {
      return;
    }
    const next = removeEditorPlacement(document, selectedPlacementId);
    persist(next);
    setSelectedPlacementId(next.placements[0]?.id ?? null);
  };

  const compositionPreview = formatEditorCompositionGraphPreview(document);

  const humanActions = useMemo(
    () => resolveContextualHumanActions(selectedLayer),
    [selectedLayer]
  );
  const aiSuggestions = useMemo(
    () => resolveEditorAiSuggestions(document, selectedLayer),
    [document, selectedLayer]
  );

  const handleHumanAction = (actionId: EditorHumanActionId) => {
    if (!selectedLayerId && actionId !== "more") {
      return;
    }
    const config = resolveEditorHumanActions(selectedLayer).find((a) => a.id === actionId);

    if (actionId === "more") {
      setUiMode("advanced");
      setShowActionMenu(false);
      return;
    }
    if (actionId === "adjust_body" && layerSupportsHumanBodyEdit(document, selectedLayer)) {
      setShowVisualBody(true);
      setPanelMode("body");
      setShowActionMenu(false);
      return;
    }
    if (actionId === "attach_logo") {
      setCustomTarget(false);
      setShowAddPlacement(true);
      setMobileSheet("add");
      setShowActionMenu(false);
      return;
    }
    if (actionId === "prepare_animation" && selectedLayerId) {
      persist(markEditorLayerAnimationReady(document, selectedLayerId));
      setSaveMessage(t("editor.human.animationReady"));
      setShowActionMenu(false);
      return;
    }
    if (actionId === "expand" && selectedLayerId) {
      const layer = document.objects.find((o) => o.id === selectedLayerId);
      if (layer) {
        persist(
          patchEditorLayerTransform(document, selectedLayerId, {
            scale: Math.min(2.5, layer.transform.scale + 0.15),
          })
        );
      }
      setShowActionMenu(false);
      return;
    }
    if (actionId === "refine_selection") {
      handleStartPreciseSelect();
      setShowActionMenu(false);
      return;
    }
    if (actionId === "edit_appearance") {
      setShowActionMenu(false);
      return;
    }
    if (actionId === "replace") {
      handleOperation("replace");
      setShowActionMenu(false);
      return;
    }
    if (actionId === "remove") {
      handleOperation("delete");
      setShowActionMenu(false);
      return;
    }
    if (actionId === "duplicate") {
      handleOperation("duplicate");
      setShowActionMenu(false);
      return;
    }
    if (actionId === "background_replace") {
      const bg = document.objects.find((o) => o.layerType === "background");
      if (bg) {
        selectLayer(bg.id);
      }
      setShowActionMenu(false);
      return;
    }
    if (actionId === "move") {
      setShowActionMenu(false);
      return;
    }
    if (config?.operation) {
      handleOperation(config.operation);
    }
    setShowActionMenu(false);
  };

  const runEditorSegmentation = async (
    mode: "refine" | "remove_background",
    onResult: (result: {
      maskUrl?: string;
      cutoutUrl?: string;
      polygon: EditorShapePoint[];
      boundingBox: { x: number; y: number; width: number; height: number };
      confidence: number;
      segmentationSource: "rembg" | "heuristic";
    }) => void
  ) => {
    if (!selectedLayerId || !selectedLayer) {
      return;
    }
    setRefiningSelection(true);
    try {
      const res = await fetch("/api/editor/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: document.backgroundUrl,
          sessionId: document.sessionId,
          mode,
          targetBounds: selectedLayer.bounds,
        }),
      });
      if (!res.ok) {
        setSaveMessage(t("editor.mask.refineFailed"));
        return;
      }
      const result = (await res.json()) as Parameters<typeof onResult>[0];
      onResult(result);
      setSaveMessage(t("editor.mask.refineSuccess"));
    } catch {
      setSaveMessage(t("editor.mask.refineFailed"));
    } finally {
      setRefiningSelection(false);
    }
  };

  const applySegmentShapeToLayer = (
    result: EditorSegmentApiShape,
    layerId: string,
    layer: EditorCanvasLayer
  ) => {
    const next = applyEditorSegmentApiShape(layer, result);
    const patched = patchEditorLayerFields(document, layerId, next);
    const detectedObjects = syncDetectedObjectsOnDocument(patched.objects, document.detectedObjects);
    const editorObject = findEditorObjectByLayerId(detectedObjects, layerId);
    const cutoutAssets =
      result.cutoutUrl && editorObject
        ? upsertEditorCutoutAsset(
            document.cutoutAssets,
            buildEditorCutoutAsset({
              object: editorObject,
              layer: next,
              cutoutUrl: result.cutoutUrl,
              maskUrl: result.maskUrl,
              maskStorageKey: result.maskStorageKey,
              polygon: result.polygon,
            })
          )
        : document.cutoutAssets;
    persist({
      ...patched,
      detectedObjects,
      cutoutAssets,
    });
    setSam2RefineVisible(true);
    const provider = result.providerUsed ?? result.segmentationSource ?? "sam2";
    setSaveMessage(
      provider === "replicate_sam3"
        ? t("editor.replicate.segmentSuccess" as never)
        : t("editor.sam2.success")
    );
  };

  const runSam2ClickSegment = async (clickPoint: EditorShapePoint) => {
    if (!selectedLayerId || !selectedLayer) {
      return;
    }
    setRefiningSelection(true);
    try {
      setLastClickFeedbackPoint(clickPoint);
      const { response: res } = await postEditorSegmentClick({
        imageUrl: document.backgroundUrl,
        backgroundStorageKey: document.backgroundStorageKey,
        clickPoint,
        positivePoints: sam2PositivePoints,
        negativePoints: sam2NegativePoints,
        targetBounds: selectedLayer.bounds,
        objectHint: selectedLayer.label,
        category: selectedLayer.category,
        semanticType: selectedLayer.semanticType,
        label: selectedLayer.label,
        editorObjectId: selectedLayerId,
        sessionId: document.sessionId,
        createCutout: true,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        reportSegmentFailure(err?.code);
        setPreciseSelectActive(false);
        return;
      }
      clearSegmentFailure();
      const result = (await res.json()) as EditorSegmentApiShape;
      applySegmentShapeToLayer(result, selectedLayerId, selectedLayer);
      setPreciseSelectActive(false);
      setPreciseSelectMode("initial");
    } catch {
      reportSegmentFailure("segmentation_internal_error");
    } finally {
      setRefiningSelection(false);
    }
  };

  const handlePreciseSelectClick = (point: EditorShapePoint, mode: PreciseSelectMode) => {
    if (mode === "add") {
      setSam2PositivePoints((prev) => [...prev, point]);
    } else if (mode === "remove") {
      setSam2NegativePoints((prev) => [...prev, point]);
    }
    void runSam2ClickSegment(point);
  };

  const handleStartPreciseSelect = () => {
    if (!replicateAvailable && sam2Available === false) {
      setSaveMessage(t("editor.sam2.unavailable"));
      return;
    }
    setLassoActive(false);
    setSam2PositivePoints([]);
    setSam2NegativePoints([]);
    setPreciseSelectMode("initial");
    setPreciseSelectActive(true);
  };

  const handleUseApproximateSelection = () => {
    setSaveMessage(t("editor.sam2.approximateKept"));
  };

  const handleRemoveBackground = () => {
    const subject = findPrimarySubjectLayer(document);
    const targetBounds = subject?.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
    setV6Busy(true);
    void (async () => {
      setRefiningSelection(true);
      try {
        const res = await fetch("/api/editor/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: document.backgroundUrl,
            sessionId: document.sessionId,
            mode: "remove_background",
            targetBounds,
          }),
        });
        if (!res.ok) {
          setSaveMessage(t("editor.backgroundRemove.failed" as never));
          return;
        }
        const result = (await res.json()) as {
          maskUrl?: string;
          cutoutUrl?: string;
          polygon: EditorShapePoint[];
        };
        if (!result.cutoutUrl) {
          setSaveMessage(t("editor.backgroundRemove.failed" as never));
          return;
        }
        const next = applyBackgroundRemovalResult(document, {
          cutoutUrl: result.cutoutUrl,
          maskUrl: result.maskUrl,
          polygon: result.polygon,
        });
        persist(next);
        const saved = await persistCutoutToLibrary(next, result.cutoutUrl);
        setSaveMessage(t(saved.messageKey as never));
      } catch {
        setSaveMessage(t("editor.backgroundRemove.failed" as never));
      } finally {
        setRefiningSelection(false);
        setV6Busy(false);
      }
    })();
  };

  const handleLassoComplete = (points: EditorShapePoint[]) => {
    if (!selectedLayerId || !selectedLayer) {
      return;
    }
    const next = applyRefinedPolygonToLayer(selectedLayer, points, { segmentationSource: "manual" });
    persist(patchEditorLayerFields(document, selectedLayerId, next));
    setLassoActive(false);
    setSaveMessage(t("editor.mask.lasso.applied"));
  };

  const handleOneClickCutout = async () => {
    if (!selectedLayerId || !selectedLayer) {
      return;
    }
    const plan = planOneClickCutout(document, selectedLayerId);
    if (!plan.needsSegmentation) {
      persist(plan.document);
      if (plan.downloadUrl) {
        const saved = await persistCutoutToLibrary(plan.document, plan.downloadUrl);
        setSaveMessage(t(saved.messageKey as never));
      } else {
        setSaveMessage(t("editor.v6.cutout.saved" as never));
      }
      return;
    }
    setV6Busy(true);
    try {
      const clickPoint = { x: selectedLayer.transform.x, y: selectedLayer.transform.y };
      const { response: res } = await postEditorSegmentClick({
        imageUrl: document.backgroundUrl,
        backgroundStorageKey: document.backgroundStorageKey,
        clickPoint,
        targetBounds: selectedLayer.bounds,
        objectHint: selectedLayer.label,
        category: selectedLayer.category,
        semanticType: selectedLayer.semanticType,
        label: selectedLayer.label,
        editorObjectId: selectedLayerId,
        sessionId: document.sessionId,
        createCutout: true,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { code?: string } | null;
        reportSegmentFailure(err?.code);
        return;
      }
      const result = (await res.json()) as EditorSegmentApiShape;
      if (!result.cutoutUrl) {
        reportSegmentFailure("cutout_generation_failed");
        return;
      }
      clearSegmentFailure();
      applySegmentShapeToLayer(result as EditorSegmentApiShape, selectedLayerId, selectedLayer);
      const latest = loadEditorCanvasDocument(document.sessionId) ?? document;
      const withLibrary = applySegmentCutoutToDocument(latest, selectedLayerId, {
        cutoutUrl: result.cutoutUrl,
        maskUrl: result.maskUrl,
        maskStorageKey: result.maskStorageKey,
        polygon: result.polygon,
      });
      persist(withLibrary.document);
      const saved = await persistCutoutToLibrary(withLibrary.document, result.cutoutUrl);
      setSaveMessage(t(saved.messageKey as never));
    } catch {
      reportSegmentFailure("segmentation_internal_error");
    } finally {
      setV6Busy(false);
    }
  };

  const handleMagicReplaceApply = (input: { prompt?: string; replacementImageUrl?: string }) => {
    if (!selectedLayer) {
      return;
    }
    void runMaskedEdit("replace", selectedLayer, input.prompt, input.replacementImageUrl);
    setShowMagicReplace(false);
  };

  const handleSelectCompositorLayer = (compositorId: string) => {
    setSelectedCompositorId(compositorId);
    const parsed = parseCompositorLayerId(compositorId);
    if (!parsed) {
      return;
    }
    if (parsed.kind === "placement") {
      selectPlacement(parsed.sourceId);
      return;
    }
    setSelectedPlacementId(null);
    setPanelMode("layer");
  };

  const handleMoveCompositorLayer = (compositorId: string, x: number, y: number) => {
    const parsed = parseCompositorLayerId(compositorId);
    if (!parsed) {
      return;
    }
    if (parsed.kind === "placement") {
      persist(
        patchEditorPlacement(document, parsed.sourceId, {
          canvasTransform: {
            ...document.placements.find((p) => p.id === parsed.sourceId)!.canvasTransform,
            x,
            y,
          },
        })
      );
      return;
    }
    if (parsed.kind === "imported" || parsed.kind === "cutout") {
      let importedId: string | undefined;
      if (parsed.kind === "imported") {
        importedId = parsed.sourceId;
      } else {
        const cutout = document.cutoutAssets?.find((asset) => asset.id === parsed.sourceId);
        importedId = document.importedLayers?.find(
          (layer) => layer.cutoutUrl && layer.cutoutUrl === cutout?.cutoutUrl
        )?.id;
      }
      if (!importedId) {
        return;
      }
      persist(
        updateImportedLayer(document, importedId, {
          transform: {
            ...(document.importedLayers?.find((l) => l.id === importedId)?.transform ?? {
              x: 0.5,
              y: 0.5,
              scale: 1,
              rotation: 0,
            }),
            x,
            y,
          },
        })
      );
    }
  };

  const handleBackgroundTool = (toolId: EditorBackgroundToolId) => {
    if (isBackgroundToolHidden(toolId)) {
      return;
    }
    const bgLayer = document.objects.find((o) => o.layerType === "background");
    if (bgLayer) {
      selectLayer(bgLayer.id);
    }
    const intent = applyBackgroundToolIntent(document, toolId);
    if (intent.document !== document) {
      persist(intent.document);
    }
    if (toolId === "remove") {
      handleRemoveBackground();
      return;
    }
    const prompt = backgroundToolPrompt(toolId);
    const bg = document.objects.find((o) => o.layerType === "background");
    if (prompt && bg) {
      const gate = evaluateEditorMaskGate(bg);
      if (!gate.allowed) {
        setMaskGateOpen(true);
        setSaveMessage(t(gate.reasonKey ?? "editor.maskGate.needRefine"));
        return;
      }
      void runMaskedEdit("replace", bg, prompt);
    }
  };

  const handleAlignment = (action: EditorAlignmentAction) => {
    if (!selectedLayerId) {
      if (action === "distribute_h") {
        persist(distributeDocumentLayers(document, "h"));
      } else if (action === "distribute_v") {
        persist(distributeDocumentLayers(document, "v"));
      }
      return;
    }
    if (action === "distribute_h") {
      persist(distributeDocumentLayers(document, "h"));
      return;
    }
    if (action === "distribute_v") {
      persist(distributeDocumentLayers(document, "v"));
      return;
    }
    persist(alignDocumentLayer(document, selectedLayerId, action));
  };

  const v7Suggestions = useMemo(
    () => resolveContextualCommandSuggestions(document),
    [document]
  );
  const v7ActivePlan = document.assistantState?.activePlan;

  const executeV7PlanStep = async (step: EditorV7CommandPlanStep) => {
    if (step.actionType === "detect_object" || step.actionType === "preserve_object") {
      return;
    }
    if (step.objectLayerId) {
      selectLayer(step.objectLayerId);
    }
    switch (step.actionType) {
      case "magic_replace": {
        const layer = document.objects.find((o) => o.id === step.objectLayerId) ?? selectedLayer;
        if (layer) {
          const prompt =
            step.params?.prompt ??
            (step.params?.replacement
              ? `Replace ${step.params.target ?? layer.label} with ${step.params.replacement}`
              : undefined);
          await runMaskedEdit("replace", layer, prompt);
        }
        break;
      }
      case "remove_object": {
        const layer = document.objects.find((o) => o.id === step.objectLayerId) ?? selectedLayer;
        if (layer) {
          await runMaskedEdit("delete", layer);
        }
        break;
      }
      case "background_remove":
        handleBackgroundTool("remove");
        break;
      case "background_tool":
        handleBackgroundTool((step.params?.tool ?? "blur") as EditorBackgroundToolId);
        break;
      case "logo_placement":
        setShowAddPlacement(true);
        setSaveMessage(t("editor.v7.plan.addLogo" as never));
        break;
      case "brand_kit": {
        let next = document;
        for (const item of defaultHomeCheffBrandKit().filter((i) => i.kind === "logo" || i.kind === "background")) {
          next = insertBrandKitItemOnCanvas(next, item);
        }
        persist(next);
        break;
      }
      case "poster_template":
        persist(applyPosterTemplate(document, (step.params?.template ?? "restaurant") as EditorPosterTemplate));
        break;
      case "social_preset":
        persist(applySocialPreset(document, (step.params?.preset ?? "instagram_post") as EditorSocialPreset));
        break;
      case "motion_ready":
        persist({
          ...document,
          workspaceMode: "export",
          exportSettings: { ...document.exportSettings, profile: "motion_ready" },
        });
        setSaveMessage(t("editor.v7.plan.motionReady" as never));
        break;
      case "quick_motion_gif":
        setWorkspaceMode("quick_motion");
        break;
      case "print_export":
        persist({
          ...document,
          workspaceMode: "export",
          exportSettings: { ...document.exportSettings, profile: "print_ready" },
        });
        break;
      case "cutout":
        await handleOneClickCutout();
        break;
      case "animate": {
        const layerId = step.objectLayerId ?? selectedLayerId;
        if (layerId) {
          persist(
            attachMotionPreview(
              document,
              layerId,
              (step.params?.preset ?? "rotate") as EditorV6MotionPreviewPreset
            )
          );
          setMotionPreviewEnabled(true);
        }
        break;
      }
      case "align":
        handleAlignment((step.params?.action ?? "center") as EditorAlignmentAction);
        break;
      case "translate_text":
        setSaveMessage(t("editor.v7.plan.translateText" as never));
        break;
      case "studio_story":
        window.open("/studio/storyboards/new", "_blank", "noopener,noreferrer");
        break;
      case "publish_social":
        persist(applySocialPreset(document, "instagram_post"));
        break;
      case "improve_composition":
        handleAlignment("center");
        break;
      default:
        break;
    }
  };

  const executeV7Plan = async (plan: EditorV7CommandPlan) => {
    setV6Busy(true);
    try {
      for (const step of plan.steps) {
        await executeV7PlanStep(step);
      }
      persist(recordAppliedCommand(document, plan));
      setSaveMessage(t("editor.v7.plan.applied" as never));
    } finally {
      setV6Busy(false);
    }
  };

  const handleV7CommandSubmit = (prompt: string) => {
    const plan = buildEditorCommandPlan(document, prompt);
    persist(attachActivePlan(document, plan, true));
  };

  const handleV7PlanApply = () => {
    if (!v7ActivePlan) {
      return;
    }
    void executeV7Plan(v7ActivePlan);
  };

  const handleV7PlanPreview = () => {
    if (!v7ActivePlan) {
      return;
    }
    persist({ ...attachActivePlan(document, v7ActivePlan, true), assistantState: document.assistantState });
    setSaveMessage(t("editor.v7.plan.previewReady" as never));
  };

  const handleV7PlanEdit = () => {
    if (!v7ActivePlan) {
      return;
    }
    persist(clearActivePlan(document));
  };

  const handleV7PlanCancel = () => {
    persist(clearActivePlan(document));
  };

  const handleV7UndoCommand = () => {
    if (!canUndoCommandHistory(document)) {
      return;
    }
    persist(undoCommandHistory(document));
    persist(undoEditorDocument(document));
  };

  const handleV7RedoCommand = () => {
    if (!canRedoCommandHistory(document)) {
      return;
    }
    persist(redoCommandHistory(document));
  };

  const handleV7RerunCommand = (entryId: string) => {
    const prompt = rerunHistoryPrompt(document, entryId);
    if (prompt) {
      handleV7CommandSubmit(prompt);
    }
  };

  const handleV7DuplicateCommand = (entryId: string) => {
    const entry = duplicateHistoryEntry(document, entryId);
    if (entry) {
      const state = document.assistantState ?? { history: [], historyCursor: -1 };
      persist({
        ...document,
        assistantState: {
          ...state,
          history: [...state.history, entry],
          historyCursor: state.history.length,
        },
      });
    }
  };

  const handleUxV7NoSelectionAction = (action: EditorUxV7NoSelectionAction) => {
    const mode = workspaceModeForNoSelectionAction(action);
    if (action === "background") {
      const bgLayer = document.objects.find((o) => o.layerType === "background");
      if (bgLayer) {
        selectLayer(bgLayer.id);
      }
      scrollToPanelRef(photoEditPanelRef);
      return;
    }
    if (mode) {
      if (workspaceMode === mode) {
        setSaveMessage(t(EDITOR_MODE_ALREADY_ACTIVE_KEYS[mode] as never));
        scrollToPanelRef(
          mode === "photo_edit"
            ? photoEditPanelRef
            : mode === "compose"
              ? composePanelRef
              : mode === "quick_motion"
                ? quickMotionPanelRef
                : exportPanelRef
        );
        return;
      }
      setWorkspaceMode(mode, { scroll: true });
    }
  };

  const handleUxV7ObjectAction = (action: EditorUxV7ObjectAction) => {
    if (!selectedLayer || !selectedLayerId) {
      return;
    }
    switch (action) {
      case "refine_selection":
        handleStartPreciseSelect();
        break;
      case "replace": {
        const gate = evaluateEditorMaskGate(selectedLayer);
        if (!gate.allowed) {
          setMaskGateOpen(true);
          setSaveMessage(t(gate.reasonKey ?? "editor.maskGate.needRefine"));
          break;
        }
        setShowMagicReplace(true);
        break;
      }
      case "remove":
        void handleOperation("delete");
        break;
      case "cutout":
        void handleOneClickCutout();
        break;
      case "animate":
        persist(attachMotionPreview(document, selectedLayerId, "float"));
        setMotionPreviewEnabled(true);
        break;
      case "duplicate":
        void handleOperation("duplicate");
        break;
      case "resize":
        setSaveMessage(t("editor.uxV7.hint.resize" as never));
        break;
      case "move":
        setSaveMessage(t("editor.uxV7.hint.move" as never));
        break;
      case "background_replace":
        handleBackgroundTool("replace");
        break;
      case "background_remove":
        handleBackgroundTool("remove");
        break;
      case "background_expand":
        handleBackgroundTool("expand");
        break;
      case "background_blur":
        handleBackgroundTool("blur");
        break;
      default:
        break;
    }
  };

  const handleLibraryAssetDrop = (payload: LibraryDragPayload) => {
    persist(dropLibraryAssetOnCanvas(document, payload));
    setSaveMessage(t("editor.v6.library.dropped" as never));
  };

  const handleAssetRecommendation = (actionId: string, prompt?: string) => {
    if (prompt) {
      void handleV7CommandSubmit(prompt);
      return;
    }
    if (actionId === "motion_ready" || actionId === "animation_ready") {
      window.location.assign(
        buildMotionReadyHrefFromEditorDocument({
          backgroundUrl: document.backgroundUrl,
          backgroundStorageKey: document.backgroundStorageKey,
          name: document.name,
          sessionId: document.sessionId,
          sourceAssetId: document.sourceAssetId,
          hcProjectId: document.instructionStudioState?.hcProjectId,
        })
      );
      return;
    }
    if (actionId === "make_transparent" || actionId === "remove_background" || actionId === "transparent_logo") {
      handleBackgroundTool("remove");
      return;
    }
    if (actionId === "create_cutout") {
      void handleOneClickCutout();
      return;
    }
    if (actionId === "add_to_brand_kit") {
      setShowReview(true);
      return;
    }
    if (actionId === "print_export" || actionId === "social_export" || actionId === "duplicate_format") {
      setAdvancedExportOpen(true);
      return;
    }
    if (actionId === "add_to_studio" || actionId === "use_in_motion") {
      window.open(
        actionId === "use_in_motion"
          ? `/animate/instant?editorSession=${encodeURIComponent(document.sessionId)}`
          : `/studio/storyboards/new?editorSession=${encodeURIComponent(document.sessionId)}`,
        "_blank"
      );
      return;
    }
    if (actionId === "save_as_mascot" || actionId === "save_to_library" || actionId === "marketplace_listing") {
      setShowReview(true);
      return;
    }
    if (actionId === "add_homecheff_logo") {
      setShowAddPlacement(true);
      return;
    }
    handleSuggestion(actionId);
  };

  const handleSuggestion = (suggestionId: string) => {
    if (
      suggestionId === "motion_ready" ||
      suggestionId === "make_transparent" ||
      suggestionId === "remove_background"
    ) {
      handleAssetRecommendation(suggestionId);
      return;
    }
    if (!selectedLayerId) {
      return;
    }
    if (suggestionId === "animation_ready" || suggestionId === "animate") {
      window.location.assign(
        buildMotionReadyHrefFromEditorDocument({
          backgroundUrl: document.backgroundUrl,
          backgroundStorageKey: document.backgroundStorageKey,
          name: document.name,
          sessionId: document.sessionId,
          sourceAssetId: document.sourceAssetId,
          hcProjectId: document.instructionStudioState?.hcProjectId,
        })
      );
      return;
    }
    if (suggestionId === "refine_selection") {
      handleStartPreciseSelect();
      return;
    }
    if (suggestionId === "outline_manual") {
      setLassoActive(true);
      return;
    }
    if (suggestionId === "detach_object") {
      handleRemoveBackground();
      return;
    }
    if (suggestionId === "remove_bg") {
      handleRemoveBackground();
      return;
    }
    if (suggestionId === "attach" || suggestionId === "duplicate") {
      setShowAddPlacement(true);
      return;
    }
    if (suggestionId === "poster" || suggestionId === "marketing" || suggestionId === "social") {
      setSaveMessage(t("editor.human.suggest.applied"));
    }
  };

  const targetLayerForAdd = customTarget ? null : selectedLayer;

  const rightPanelTabs = (
    <div className="mb-2 flex flex-wrap gap-1">
      {(["layer", "placement", "body"] as PanelMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          disabled={mode === "body" && !supportsBodyDesigner}
          onClick={() => setPanelMode(mode)}
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
            panelMode === mode ? "bg-[#0067B1] text-white" : "border border-zinc-200 text-zinc-700"
          } disabled:opacity-40`}
        >
          {t(`editor.panel.${mode}` as never)}
        </button>
      ))}
    </div>
  );

  const propertiesPanel =
    panelMode === "body" && supportsBodyDesigner ?
      <EditorBodyDesignerPanel
        value={bodyDesigner}
        objectType={objectType}
        onChange={(next) => persist({ ...document, bodyDesigner: next })}
        onReset={() => persist({ ...document, bodyDesigner: DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS })}
      />
    : panelMode === "placement" ?
      <EditorPlacementPropertiesPanel
        placement={(selectedPlacement as EditorPlacementItem) ?? null}
        onPatch={(patch) => {
          if (!selectedPlacementId) {
            return;
          }
          persist(patchEditorPlacement(document, selectedPlacementId, patch));
        }}
        onCenterOnTarget={() => {
          if (!selectedPlacementId) {
            return;
          }
          persist(centerPlacementOnTarget(document, selectedPlacementId));
        }}
        onBringForward={() => {
          if (!selectedPlacementId) {
            return;
          }
          persist(reorderEditorPlacementZIndex(document, selectedPlacementId, "forward"));
        }}
        onSendBackward={() => {
          if (!selectedPlacementId) {
            return;
          }
          persist(reorderEditorPlacementZIndex(document, selectedPlacementId, "backward"));
        }}
        onDuplicate={() => {
          if (!selectedPlacementId) {
            return;
          }
          const next = duplicateEditorPlacement(document, selectedPlacementId);
          persist(next);
          const copy = next.placements[next.placements.length - 1];
          if (copy) {
            setSelectedPlacementId(copy.id);
          }
        }}
        onDelete={handleDeletePlacement}
        onReplaceSource={() => {
          setReplacePlacementId(selectedPlacementId);
          setShowAddPlacement(true);
        }}
      />
    : <EditorPropertiesPanel
        layer={selectedLayer}
        parentLabel={
          selectedLayer?.parentObjectId
            ? (document.objects.find((o) => o.id === selectedLayer.parentObjectId)?.label ?? null)
            : null
        }
        onOperation={handleOperation}
        onPatch={(patch) => {
          if (!selectedLayerId) {
            return;
          }
          persist(patchEditorLayerFields(document, selectedLayerId, patch));
        }}
        showAiAnalysis={showAiAnalysis}
      />;

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          {!instructionStudioActive ?
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("suite.breadcrumb.editor")} / {t("editor.canvas.breadcrumb")}
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">{document.name}</h1>
              <p className="text-sm text-zinc-600">
                {uiMode === "visual"
                  ? t("editor.human.modeVisual")
                  : t(`editor.canvas.step.${document.workflowStep}` as never)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {editorAdminCanShowAiAnalysis(isAdmin) ?
                <button
                  type="button"
                  onClick={() => setShowAiAnalysis((v) => !v)}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
                    showAiAnalysis
                      ? "bg-violet-600 text-white"
                      : "border border-violet-300 bg-white text-violet-800"
                  }`}
                >
                  {showAiAnalysis
                    ? t("editor.ux.aiAnalysis.hide" as never)
                    : t("editor.ux.aiAnalysis.show" as never)}
                </button>
              : null}
              <button
                type="button"
                onClick={() => {
                  setUiMode(uiMode === "visual" ? "advanced" : "visual");
                  setShowActionMenu(false);
                  setShowVisualBody(false);
                }}
                className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                {uiMode === "visual"
                  ? t("editor.human.openAdvanced")
                  : t("editor.human.backToVisual")}
              </button>
            </div>
          </header>
          : null}

          {!instructionStudioActive && uiMode === "visual" ?
            <p className="mb-3 text-sm text-zinc-600">{t("editor.human.lead")}</p>
          : null}

          {uiMode === "advanced" ?
            <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCustomTarget(false);
                setShowAddPlacement(true);
                setMobileSheet("add");
              }}
              className="min-h-11 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a9c]"
            >
              {t("editor.placement.add")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomTarget(true);
                setShowAddPlacement(true);
                setMobileSheet("add");
              }}
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
            >
              {t("editor.placement.addCustomArea")}
            </button>
            <button
              type="button"
              onClick={() => setMobileSheet("target")}
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 lg:hidden"
            >
              {t("editor.placement.selectTarget")}
            </button>
            <button
              type="button"
              onClick={() => setMobileSheet("properties")}
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 lg:hidden"
            >
              {t("editor.placement.propertiesTitle")}
            </button>
          </div>
          : null}

          {!instructionStudioActive ?
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!editorCanUndo(document)}
              onClick={() => persist(undoEditorDocument(document))}
              className="min-h-9 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-40"
            >
              {t("editor.history.undo")}
            </button>
            <button
              type="button"
              disabled={!editorCanRedo(document)}
              onClick={() => persist(redoEditorDocument(document))}
              className="min-h-9 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-40"
            >
              {t("editor.history.redo")}
            </button>
          </div>
          : null}

          {!instructionStudioActive ?
          <EditorToolbar
            onBack={onBack}
            onDownload={() => void handleDownload()}
            onSaveDraft={handleSaveDraft}
            onReview={() => {
              persist({ ...document, workflowStep: "review" });
              setShowReview(true);
            }}
            saving={saving}
          />
          : null}

          {!showReview && uiMode === "advanced" ?
            <div className="mt-4 flex flex-wrap gap-2">
              {EDITOR_LEGACY_WORKSPACE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkspaceMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    workspaceMode === mode
                      ? "bg-[#0067B1] text-white"
                      : "border border-zinc-300 bg-white text-zinc-800"
                  }`}
                >
                  {t(EDITOR_MODE_LABEL_KEYS[mode] as never)}
                </button>
              ))}
            </div>
          : null}

          {showReview ?
            <div className="mt-4">
              <EditorReviewPanel
                document={document}
                onContinueEditing={() => {
                  setShowReview(false);
                  persist({ ...document, workflowStep: "visual_editor" });
                }}
                onSaved={(saved) => {
                  persist(saved);
                  setSaveMessage(t("editor.review.save.success"));
                }}
                onDiscard={() => {
                  if (window.confirm(t("editor.review.discardConfirm"))) {
                    onBack();
                  }
                }}
              />
            </div>
          : null}

          {!showReview && saveMessage ?
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {saveMessage}
            </p>
          : null}

          {!showReview && uiMode === "advanced" && showAiAnalysis && compositionPreview.length > 0 ?
            <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700">
              {compositionPreview.join("\n")}
            </pre>
          : null}

          {!showReview && uiMode === "visual" && instructionStudioActive ?
            <EditorV2WorkflowShell
              document={document}
              busy={v6Busy || saving}
              isAdmin={isAdmin}
              saving={saving}
              onDocumentChange={persist}
              onSaveProject={requestSaveProject}
              onRenameProject={requestRenameProject}
              onSaveAsNewProject={requestSaveAsNewProject}
              onClose={onBack}
              onOpenInProjects={handleOpenInProjects}
              onArchiveProject={linkedHcProject ? handleArchiveLinkedProject : undefined}
              onRestoreProject={linkedHcProject ? handleRestoreLinkedProject : undefined}
              onDeleteProject={linkedHcProject ? handleDeleteLinkedProject : undefined}
              onDownloadProject={handleDownloadProjectFile}
              onImportProject={importFlow.openImportPicker}
              isProjectArchived={isLinkedProjectArchived}
              onReview={() => {
                persist({ ...document, workflowStep: "review" });
                setShowReview(true);
              }}
              onDownload={() => void handleDownload()}
              onToggleAdvanced={() => {
                setUiMode(uiMode === "visual" ? "advanced" : "visual");
                setShowActionMenu(false);
                setShowVisualBody(false);
              }}
              advancedMode={false}
              onToggleAiAnalysis={() => setShowAiAnalysis((v) => !v)}
              showAiAnalysis={showAiAnalysis}
            />
          : null}

          {!showReview && uiMode === "visual" && !instructionStudioActive ?
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                {visibleWorkspaceModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWorkspaceMode(mode)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      workspaceMode === mode
                        ? "bg-[#0067B1] text-white"
                        : "border border-zinc-300 bg-white text-zinc-800"
                    }`}
                  >
                    {t(EDITOR_MODE_LABEL_KEYS[mode] as never)}
                  </button>
                ))}
              </div>

              <EditorVisionSummaryPanel document={document} />

              {document.assetProfile ?
                <EditorAssetRecommendationsPanel
                  profile={document.assetProfile}
                  onAction={handleAssetRecommendation}
                />
              : null}

              {segmentationStatusKey && segmentationUiState !== "idle" ?
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    segmentationUiState === "segmenting"
                      ? "border-[#0067B1]/30 bg-[#0067B1]/5 text-[#0067B1]"
                      : segmentationUiState === "mask_ready"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : segmentationStateAllowsRetry(segmentationUiState)
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-zinc-200 bg-zinc-50 text-zinc-800"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <p>{t(segmentationStatusKey as never)}</p>
                  {segmentationStateAllowsRetry(segmentationUiState) ?
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
                      onClick={() => {
                        clearSegmentFailure();
                        if (lastClickFeedbackPoint) {
                          openClickSegmentPrompt(lastClickFeedbackPoint, clickSegmentParentLayerId);
                        } else if (selectedLayer) {
                          void tryAutoAcquireMask(selectedLayer, lastClickFeedbackPoint);
                        }
                      }}
                    >
                      {t("editor.segmentState.retry" as never)}
                    </button>
                  : null}
                </div>
              : null}

              <EditorMagicEditBar
                busy={v6Busy || saving}
                document={document}
                isAdmin={isAdmin}
                suggestions={v7Suggestions}
                onSubmit={handleV7CommandSubmit}
              />
              {v7ActivePlan && document.assistantState?.previewMode ?
                <EditorActionPlanPreview
                  plan={v7ActivePlan}
                  busy={v6Busy || saving}
                  onPreview={handleV7PlanPreview}
                  onApply={handleV7PlanApply}
                  onEdit={handleV7PlanEdit}
                  onCancel={handleV7PlanCancel}
                />
              : null}

              {document.detectionMeta?.userMessageKey ?
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t(document.detectionMeta.userMessageKey as never)}
                </p>
              : null}

              <EditorDetectionStatusBanner meta={document.detectionMeta} />

              {isAdmin && document.visionV6Meta ? (
                <EditorVisionV6DebugPanel
                  visionV6Meta={document.visionV6Meta}
                  detectionMeta={document.detectionMeta}
                />
              ) : null}

              <EditorHumanObjectList
                layers={document.objects}
                selectedLayerId={selectedLayerId}
                onSelect={selectLayer}
              />

              {isAdmin ?
                <>
                  <EditorClickTraceDebugPanel
                    lastClickPoint={lastClickFeedbackPoint}
                    pickedLayerId={clickDebugPickedLayerId ?? selectedLayerId}
                    pickedLayerLabel={
                      document.objects.find(
                        (o) => o.id === (clickDebugPickedLayerId ?? selectedLayerId)
                      )?.label ?? null
                    }
                    promptVisible={Boolean(clickSegmentPoint)}
                    segmentationState={segmentationUiState}
                    segmenting={refiningSelection || clickSegmentBusy}
                    lastApiStatus={
                      activeSegmentJobId
                        ? `${clickDebugApiStatus ?? ""} jobId=${activeSegmentJobId}`
                        : clickDebugApiStatus
                    }
                    lastHandler={clickDebugHandler}
                  />
                  <p className="text-xs text-zinc-500">
                    {t("editor.detectionBootstrap.providerStatus" as never, {
                      sam2: sam2Available ? "OK" : "—",
                      rembg: rembgAvailable ? "OK" : "—",
                      replicate: replicateAvailable ? "OK" : "—",
                      autoMask: autoMaskProviderAvailable ? "OK" : "—",
                    })}
                  </p>
                  <EditorSelectionVerificationPanel
                    layer={selectedLayer}
                    primaryProvider={replicateAvailable ? "replicate_sam3" : sam2Available ? "sam2" : rembgAvailable ? "rembg" : null}
                  />
                </>
              : null}

              <EditorContextualActionBar
                layer={selectedLayer && !selectedPlacementId ? selectedLayer : null}
                busy={v6Busy || saving}
                workspaceMode={workspaceMode}
                onNoSelectionAction={handleUxV7NoSelectionAction}
                onObjectAction={handleUxV7ObjectAction}
              />

              <div className="relative mx-auto w-full max-w-4xl">
                <EditorCanvasPreview
                  document={document}
                  selectedLayerId={selectedLayerId}
                  selectedPlacementId={selectedPlacementId}
                  showBodyGuide={showVisualBody}
                  humanFirst
                  onSelectLayer={selectLayer}
                  onEmptyCanvasClick={handleEmptyCanvasClick}
                  onApproximateLayerClick={handleApproximateLayerClick}
                  onSelectPlacement={selectPlacement}
                  onMoveLayer={(layerId, x, y) => persist(patchEditorLayerTransform(document, layerId, { x, y }))}
                  onMovePlacement={(placementId, x, y) =>
                    persist(
                      patchEditorPlacement(document, placementId, {
                        canvasTransform: {
                          ...document.placements.find((p) => p.id === placementId)!.canvasTransform,
                          x,
                          y,
                        },
                      })
                    )
                  }
                  onResizePlacement={(placementId, width, height) =>
                    persist(patchEditorPlacement(document, placementId, { canvasWidth: width, canvasHeight: height }))
                  }
                  onScaleLayer={(layerId, scale) =>
                    persist(patchEditorLayerTransform(document, layerId, { scale }))
                  }
                  onRotateLayer={(layerId, rotation) =>
                    persist(patchEditorLayerTransform(document, layerId, { rotation }))
                  }
                  lassoActive={lassoActive}
                  onLassoComplete={handleLassoComplete}
                  onLassoCancel={() => setLassoActive(false)}
                  preciseSelectActive={preciseSelectActive}
                  preciseSelectMode={preciseSelectMode}
                  preciseSelectLoading={refiningSelection}
                  onPreciseSelectClick={handlePreciseSelectClick}
                  onPreciseSelectCancel={() => setPreciseSelectActive(false)}
                  hierarchicalSelection={hierarchicalSelection}
                  objectHierarchies={document.objectHierarchies}
                  selectedPartId={selectedPartId}
                  selectionRefining={refiningSelection}
                  motionPreviewEnabled={motionPreviewEnabled}
                  onLibraryAssetDrop={handleLibraryAssetDrop}
                  showAlignmentGuides={document.productivityState?.showAlignmentGuides}
                  selectedCompositorId={selectedCompositorId}
                  onSelectCompositorLayer={handleSelectCompositorLayer}
                  onMoveCompositorLayer={handleMoveCompositorLayer}
                  segmenting={refiningSelection || clickSegmentBusy || Boolean(activeSegmentJobId)}
                  segmentMessageKey={segmentCanvasMessageKey}
                  clickFeedbackPoint={lastClickFeedbackPoint}
                  showSelectionHelp={segmentationUiState !== "mask_ready" && !clickSegmentPoint}
                />
                {clickSegmentPoint ?
                  <div className="absolute bottom-2 left-2 right-2 z-40 max-h-[min(50vh,320px)] overflow-y-auto">
                    <EditorClickSegmentPrompt
                      clickPoint={clickSegmentPoint}
                      busy={clickSegmentBusy || refiningSelection}
                      onSelectObject={() => void handleClickSegmentObject()}
                      onSelectWithPrompt={(prompt) => void handleClickSegmentPrompt(prompt)}
                      onOutline={handleClickSegmentOutline}
                      onDismiss={dismissClickSegmentPrompt}
                    />
                  </div>
                : null}
                {showActionMenu && selectedLayer && !selectedPlacementId ?
                  <div className="absolute left-4 top-16 z-30 sm:left-8">
                    <EditorObjectActionMenu
                      actions={humanActions}
                      objectLabel={t(humanFirstObjectLabelKey(selectedLayer))}
                      onAction={handleHumanAction}
                      onClose={() => setShowActionMenu(false)}
                    />
                  </div>
                : null}
              </div>

              {selectedLayer && !selectedPlacementId && modeShowsPhotoEditObjectPanels(workspaceMode) ?
                <div ref={photoEditPanelRef} className="space-y-3">
                  {showMagicReplace ?
                    <EditorMagicReplacePanel
                      document={document}
                      layer={selectedLayer}
                      onDocumentChange={persist}
                      onApply={handleMagicReplaceApply}
                    />
                  : null}
                  {selectedLayer.layerType === "background" ?
                    <EditorBackgroundToolsPanel onSelect={handleBackgroundTool} />
                  : null}
                  {hierarchicalSelection.mode === "part" ?
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                      <span>{t("editor.visionV4.partModeActive" as never)}</span>
                      {selectedPartId ?
                        <>
                          <button
                            type="button"
                            className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white"
                            onClick={() => setMotionPreviewEnabled((v) => !v)}
                          >
                            {motionPreviewEnabled
                              ? t("editor.visionV4.stopPreview" as never)
                              : t("editor.visionV4.previewAnimation" as never)}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-violet-300 px-2 py-1 text-xs font-medium"
                            onClick={handleSavePartToLibrary}
                          >
                            {t("editor.visionV4.savePart" as never)}
                          </button>
                        </>
                      : null}
                      <button
                        type="button"
                        className="rounded-md border border-violet-300 px-2 py-1 text-xs font-medium"
                        onClick={handleExitPartMode}
                      >
                        {t("editor.visionV4.exitPartMode" as never)}
                      </button>
                    </div>
                  : null}
                  {showAiAnalysis && sam2Available !== null ?
                    <p className="text-xs text-zinc-500">
                      {sam2Available
                        ? t("editor.sam2.statusAvailable")
                        : t("editor.sam2.statusUnavailableDev")}
                    </p>
                  : null}
                  {resolveHumanFirstObjectType(selectedLayer) !== "logo" &&
                  resolveHumanFirstObjectType(selectedLayer) !== "text" &&
                  kindUsesSelectionTools(resolveEditorObjectKind(selectedLayer)) ?
                    <EditorSelectionToolsPanel
                      layer={selectedLayer}
                      refining={refiningSelection}
                      sam2Available={sam2Available}
                      replicateAvailable={replicateAvailable}
                      rembgAvailable={rembgAvailable}
                      showAiAnalysis={showAiAnalysis}
                      onPreciseSelect={handleStartPreciseSelect}
                      onStartLasso={() => {
                        setPreciseSelectActive(false);
                        setLassoActive(true);
                      }}
                      onUseApproximate={handleUseApproximateSelection}
                      onRemoveBackground={handleRemoveBackground}
                      onDetachObject={handleRemoveBackground}
                    />
                  : null}
                  <EditorRefinePointsPanel
                    visible={
                      sam2RefineVisible &&
                      selectedLayer.selectionShape?.segmentationSource === "sam2"
                    }
                    refining={refiningSelection}
                    onAddPoint={() => {
                      setPreciseSelectMode("add");
                      setPreciseSelectActive(true);
                    }}
                    onRemovePoint={() => {
                      setPreciseSelectMode("remove");
                      setPreciseSelectActive(true);
                    }}
                    onReset={() => {
                      setSam2PositivePoints([]);
                      setSam2NegativePoints([]);
                      setSam2RefineVisible(false);
                      setPreciseSelectActive(false);
                    }}
                    onAccept={() => {
                      setSam2RefineVisible(false);
                      setPreciseSelectActive(false);
                      setSaveMessage(t("editor.sam2.accepted"));
                    }}
                  />
                  {showAiAnalysis ?
                    <EditorAiSuggestions suggestions={aiSuggestions} onSelect={handleSuggestion} />
                  : null}
                </div>
              : null}

              {modeShowsMotionPreparePanels(document) ?
                <div className="space-y-3">
                  <EditorHandoffScorePanel document={document} />
                  {selectedLayer && selectedLayerId ?
                    <EditorMotionPreviewBar
                      document={document}
                      layerId={selectedLayerId}
                      onDocumentChange={persist}
                      onPreviewChange={setMotionPreviewEnabled}
                    />
                  : null}
                </div>
              : null}

              {modeShowsComposePanels(workspaceMode) ?
                <div ref={composePanelRef} className="space-y-3">
                  <input
                    ref={composerSourceRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleComposerSourceUpload(file);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={composerUploading}
                    onClick={() => composerSourceRef.current?.click()}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 disabled:opacity-50"
                  >
                    {composerUploading
                      ? t("editor.v5.composer.uploading" as never)
                      : t("editor.v5.composer.addSource" as never)}
                  </button>
                  <EditorDualComposerPanel document={document} onDocumentChange={persist} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    {modeShowsLibraryPanels(workspaceMode) ?
                      <EditorLibraryDragPanel document={document} onDocumentChange={persist} />
                    : null}
                    {modeShowsBrandKit(workspaceMode) ?
                      <EditorBrandKitPanel document={document} onDocumentChange={persist} />
                    : null}
                  </div>
                </div>
              : null}

              {modeShowsQuickMotionPanel(workspaceMode) ?
                <div ref={quickMotionPanelRef} className="space-y-3">
                  <EditorQuickMotionPanel document={document} onDocumentChange={persist} />
                  {selectedLayer && selectedLayerId && modeShowsMotionPreviewBar(workspaceMode, document) ?
                    <EditorMotionPreviewBar
                      document={document}
                      layerId={selectedLayerId}
                      onDocumentChange={persist}
                      onPreviewChange={setMotionPreviewEnabled}
                    />
                  : null}
                </div>
              : null}

              {modeShowsExportAdvancedPanels(workspaceMode) ?
                <div className="space-y-3">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <EditorPosterBuilderPanel document={document} onDocumentChange={persist} />
                    <EditorSocialKitPanel document={document} onDocumentChange={persist} />
                  </div>
                  <EditorHandoffScorePanel document={document} />
                  {modeShowsAlignmentTools(workspaceMode) ?
                    <EditorAlignmentToolbar onAlign={handleAlignment} />
                  : null}
                </div>
              : null}

              {modeShowsExportHub(workspaceMode) ?
                <div ref={exportPanelRef} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAdvancedExportOpen((v) => !v)}
                    className="text-xs font-medium text-zinc-600 underline"
                  >
                    {advancedExportOpen
                      ? t("editor.v5.export.hideAdvanced" as never)
                      : t("editor.v5.export.showAdvanced" as never)}
                  </button>
                  <EditorExportHubPanel
                    document={document}
                    onDocumentChange={persist}
                    advancedOpen={advancedExportOpen}
                  />
                </div>
              : null}

              {showVisualBody && layerSupportsHumanBodyEdit(document, selectedLayer) ?
                <div className="mx-auto max-w-md">
                  <EditorVisualBodyPanel
                    value={bodyDesigner}
                    objectType={objectType}
                    onChange={(next) => persist({ ...document, bodyDesigner: next })}
                    onClose={() => setShowVisualBody(false)}
                  />
                </div>
              : null}

              {(showAddPlacement || replacePlacementId) ?
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-zinc-900">{t("editor.human.attachLogoTitle")}</p>
                  <EditorAddPlacementPanel
                    targetLayer={targetLayerForAdd}
                    customTarget={customTarget}
                    onAdd={(placement) => {
                      if (replacePlacementId) {
                        persist(
                          patchEditorPlacement(document, replacePlacementId, {
                            ...placement,
                            id: replacePlacementId,
                            linkedObjectId: placement.linkedObjectId,
                            targetLabel: placement.targetLabel,
                          })
                        );
                        setReplacePlacementId(null);
                      } else {
                        handleAddPlacement(placement);
                      }
                      setShowAddPlacement(false);
                    }}
                    onClose={() => {
                      setShowAddPlacement(false);
                      setReplacePlacementId(null);
                    }}
                  />
                </div>
              : null}

              <div className="flex flex-wrap gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileSheet("target")}
                  className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
                >
                  {t("editor.human.tapToSelect")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTarget(false);
                    setShowAddPlacement(true);
                    setMobileSheet("add");
                  }}
                  className="min-h-11 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
                >
                  {t("editor.human.action.attachLogo")}
                </button>
              </div>
              </div>
              <EditorAssistantSidebar
                document={document}
                collapsed={document.assistantState?.sidebarCollapsed}
                onToggleCollapse={() => persist(toggleAssistantSidebar(document))}
                onSuggestion={handleV7CommandSubmit}
                onUndoCommand={handleV7UndoCommand}
                onRedoCommand={handleV7RedoCommand}
                onRerunCommand={handleV7RerunCommand}
                onDuplicateCommand={handleV7DuplicateCommand}
              />
            </div>
          : null}

          {!showReview && uiMode === "advanced" ?
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
            <div className="order-2 hidden lg:block lg:order-1">
              <EditorLayerTree
                layers={document.objects}
                selectedLayerId={selectedLayerId}
                onSelect={selectLayer}
                onToggleVisibility={(id) => persist(applyEditorLayerOperation(document, id, "visibility"))}
                onToggleLock={(id) => persist(applyEditorLayerOperation(document, id, "lock"))}
                onRename={(id, label) => persist(renameEditorLayerInDocument(document, id, label))}
                onReorder={(id, direction) => persist(reorderEditorLayerInDocument(document, id, direction))}
                humanFirst={!showAiAnalysis}
                showAiAnalysis={showAiAnalysis}
              />
              {(document.visionHierarchy?.length ?? 0) > 0 ? (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
                  <EditorVisionHierarchyPanel
                    hierarchy={document.visionHierarchy ?? []}
                    selectedNodeId={
                      hierarchicalSelection.selectedPartId ??
                      selectedLayerId
                    }
                    onSelectNode={selectVisionHierarchyNode}
                  />
                </div>
              ) : null}
              {document.placements.length > 0 ?
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">{t("editor.placement.listTitle")}</p>
                  <ul className="mt-2 space-y-1">
                    {document.placements.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectPlacement(p.id)}
                          className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                            selectedPlacementId === p.id ? "bg-[#0067B1]/10 text-[#0067B1]" : "hover:bg-zinc-50"
                          }`}
                        >
                          {p.sourceName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              : null}
            </div>
            <div className="order-1 lg:order-2">
              <EditorCanvasPreview
                document={document}
                selectedLayerId={selectedLayerId}
                selectedPlacementId={selectedPlacementId}
                showBodyGuide={panelMode === "body"}
                humanFirst={false}
                onSelectLayer={selectLayer}
                onEmptyCanvasClick={handleEmptyCanvasClick}
                onApproximateLayerClick={handleApproximateLayerClick}
                onSelectPlacement={selectPlacement}
                onMoveLayer={(layerId, x, y) => persist(patchEditorLayerTransform(document, layerId, { x, y }))}
                onMovePlacement={(placementId, x, y) =>
                  persist(
                    patchEditorPlacement(document, placementId, {
                      canvasTransform: {
                        ...document.placements.find((p) => p.id === placementId)!.canvasTransform,
                        x,
                        y,
                      },
                    })
                  )
                }
                onResizePlacement={(placementId, width, height) =>
                  persist(patchEditorPlacement(document, placementId, { canvasWidth: width, canvasHeight: height }))
                }
                selectedCompositorId={selectedCompositorId}
                onSelectCompositorLayer={handleSelectCompositorLayer}
                onMoveCompositorLayer={handleMoveCompositorLayer}
              />
            </div>
            <div className="order-3 hidden lg:block">
              {rightPanelTabs}
              {propertiesPanel}
            </div>
          </div>
          : null}

          {!showReview && uiMode === "advanced" && isAdmin && showAiAnalysis ?
            <EditorPlacementQaPanel document={document} />
          : null}

          {!showReview && uiMode === "advanced" && (showAddPlacement || replacePlacementId) ?
            <div className="mt-4 hidden rounded-2xl border border-zinc-200 bg-white p-4 lg:block">
              <EditorAddPlacementPanel
                targetLayer={targetLayerForAdd}
                customTarget={customTarget}
                onAdd={(placement) => {
                  if (replacePlacementId) {
                    persist(
                      patchEditorPlacement(document, replacePlacementId, {
                        ...placement,
                        id: replacePlacementId,
                        linkedObjectId: placement.linkedObjectId,
                        targetLabel: placement.targetLabel,
                      })
                    );
                    setReplacePlacementId(null);
                  } else {
                    handleAddPlacement(placement);
                  }
                  setShowAddPlacement(false);
                }}
                onClose={() => {
                  setShowAddPlacement(false);
                  setReplacePlacementId(null);
                }}
              />
            </div>
          : null}
        </section>

        <EditorMobileBottomSheet
          open={mobileSheet === "target"}
          title={t("editor.placement.selectTarget")}
          onClose={() => setMobileSheet(null)}
        >
          <EditorLayerTree
            layers={document.objects}
            selectedLayerId={selectedLayerId}
            onSelect={(id) => {
              selectLayer(id);
              setMobileSheet(null);
            }}
            onToggleVisibility={(id) => persist(applyEditorLayerOperation(document, id, "visibility"))}
            onToggleLock={(id) => persist(applyEditorLayerOperation(document, id, "lock"))}
            onRename={(id, label) => persist(renameEditorLayerInDocument(document, id, label))}
            onReorder={(id, direction) => persist(reorderEditorLayerInDocument(document, id, direction))}
            humanFirst={!showAiAnalysis}
            showAiAnalysis={showAiAnalysis}
          />
        </EditorMobileBottomSheet>

        <EditorMobileBottomSheet
          open={mobileSheet === "properties"}
          title={t("editor.placement.propertiesTitle")}
          onClose={() => setMobileSheet(null)}
        >
          {rightPanelTabs}
          {propertiesPanel}
        </EditorMobileBottomSheet>

        <EditorMobileBottomSheet
          open={mobileSheet === "add"}
          title={t("editor.placement.add")}
          onClose={() => setMobileSheet(null)}
        >
          <EditorAddPlacementPanel
            targetLayer={targetLayerForAdd}
            customTarget={customTarget}
            onAdd={(placement) => {
              handleAddPlacement(placement);
              setMobileSheet(null);
            }}
            onClose={() => setMobileSheet(null)}
          />
        </EditorMobileBottomSheet>
      </main>
      <EditorMaskGateDialog
        open={maskGateOpen}
        onRefine={() => {
          setMaskGateOpen(false);
          handleStartPreciseSelect();
        }}
        onLasso={() => {
          setMaskGateOpen(false);
          setLassoActive(true);
        }}
        onCancel={() => setMaskGateOpen(false)}
      />
      <EditorProjectNameDialog
        open={nameDialogOpen}
        initialName={document.name}
        required={nameDialogMode === "rename"}
        onCancel={() => setNameDialogOpen(false)}
        onConfirm={(name) => void handleNameDialogConfirm(name)}
      />
      <HcProjectDeleteDialog
        open={deleteDialogOpen}
        projectTitle={linkedHcProject?.title ?? document.name}
        showExportedWarning={linkedHcProject ? hcProjectHasExportedResults(linkedHcProject) : false}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteLinkedProject}
      />
      <input
        ref={importFlow.fileInputRef}
        type="file"
        accept=".hc,application/json,application/vnd.homecheff.project+json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importFlow.handleFile(file);
          }
        }}
      />
      <HcProjectImportDialog
        open={importFlow.dialogOpen}
        preview={importFlow.preview}
        errorKey={importFlow.errorKey}
        busy={importFlow.busy}
        onCancel={importFlow.cancelImport}
        onConfirm={() => void importFlow.confirmImport()}
      />
    </StudioAuthGate>
  );
}
