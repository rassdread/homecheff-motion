"use client";

import { useMemo, useState } from "react";
import { EditorAddPlacementPanel } from "@/components/editor/editor-add-placement-panel";
import { EditorBodyDesignerPanel } from "@/components/editor/editor-body-designer-panel";
import { EditorCanvasPreview } from "@/components/editor/editor-canvas-preview";
import { EditorLayerTree } from "@/components/editor/editor-layer-tree";
import { EditorMobileBottomSheet } from "@/components/editor/editor-mobile-bottom-sheet";
import { EditorPlacementPropertiesPanel } from "@/components/editor/editor-placement-properties-panel";
import { EditorPlacementQaPanel } from "@/components/editor/editor-placement-qa-panel";
import { EditorPropertiesPanel } from "@/components/editor/editor-properties-panel";
import { EditorReviewPanel } from "@/components/editor/editor-review-panel";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import {
  applyEditorLayerOperation,
  markEditorDocumentDraftSaved,
  patchEditorLayerFields,
  patchEditorLayerTransform,
  saveEditorCanvasDocument,
  buildEditorDownloadFilename,
} from "@/lib/editor-canvas-session";
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
import { DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onBack: () => void;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

import type { EditorCanvasDocument, EditorObjectOperation, EditorPlacementItem } from "@/types/homecheff-visual-editor";

type PanelMode = "layer" | "placement" | "body";

export function EditorCanvasWorkspace({ document, onBack, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    document.objects.find((o) => o.layerType !== "background")?.id ?? null
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("layer");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showAddPlacement, setShowAddPlacement] = useState(false);
  const [customTarget, setCustomTarget] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"target" | "properties" | "add" | null>(null);
  const [replacePlacementId, setReplacePlacementId] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

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
    const saved = saveEditorCanvasDocument(next);
    onDocumentChange(saved);
    return saved;
  };

  const selectLayer = (layerId: string) => {
    setSelectedLayerId(layerId);
    setSelectedPlacementId(null);
    setPanelMode("layer");
    setCustomTarget(false);
  };

  const selectPlacement = (placementId: string) => {
    setSelectedPlacementId(placementId);
    setPanelMode("placement");
  };

  const handleOperation = (operation: EditorObjectOperation) => {
    if (!selectedLayerId) {
      return;
    }
    const next = applyEditorLayerOperation(document, selectedLayerId, operation);
    persist(next);
    if (operation === "delete") {
      setSelectedLayerId(next.objects.find((o) => o.layerType !== "background")?.id ?? null);
    }
  };

  const handleSaveDraft = () => {
    setSaving(true);
    const saved = markEditorDocumentDraftSaved(document);
    const payload = buildEditorSavePayload(saved);
    persist(saved);
    setSaveMessage(
      t("editor.placement.saveDraftSuccess", {
        layers: String(payload.semanticLayers.filter((l) => l.type !== "background").length),
        placements: String(payload.placementCount),
      })
    );
    setSaving(false);
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
      />;

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("suite.breadcrumb.editor")} / {t("editor.canvas.breadcrumb")}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{document.name}</h1>
            <p className="text-sm text-zinc-600">{t(`editor.canvas.step.${document.workflowStep}` as never)}</p>
          </header>

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

          {!showReview && compositionPreview.length > 0 ?
            <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700">
              {compositionPreview.join("\n")}
            </pre>
          : null}

          {!showReview ?
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
            <div className="order-2 hidden lg:block lg:order-1">
              <EditorLayerTree
                layers={document.objects}
                selectedLayerId={selectedLayerId}
                onSelect={selectLayer}
                onToggleVisibility={(id) => persist(applyEditorLayerOperation(document, id, "visibility"))}
                onToggleLock={(id) => persist(applyEditorLayerOperation(document, id, "lock"))}
              />
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
                onSelectLayer={selectLayer}
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
              />
            </div>
            <div className="order-3 hidden lg:block">
              {rightPanelTabs}
              {propertiesPanel}
            </div>
          </div>
          : null}

          {!showReview ?
            <EditorPlacementQaPanel document={document} />
          : null}

          {!showReview && (showAddPlacement || replacePlacementId) ?
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
    </StudioAuthGate>
  );
}
