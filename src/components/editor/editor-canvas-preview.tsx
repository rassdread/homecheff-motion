"use client";

import { useState } from "react";
import { EditorBodyGuideOverlay } from "@/components/editor/editor-body-guide-overlay";
import {
  EditorPreciseSelectOverlay,
  type PreciseSelectMode,
} from "@/components/editor/editor-precise-select-overlay";
import { EditorRefineLassoOverlay } from "@/components/editor/editor-refine-lasso-overlay";
import { EditorSelectionOutline } from "@/components/editor/editor-selection-outline";
import { useActiveTranslator } from "@/i18n/client";
import { renderableEditorLayers } from "@/lib/editor-canvas-layers";
import { visibleEditorPlacements } from "@/lib/editor-placement-canvas";
import { isEditorOperationAllowed } from "@/lib/editor-layer-action-eligibility";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import {
  hoverPartsAtPoint,
  pickHierarchicalAtPoint,
} from "@/lib/editor-hierarchical-selection";
import {
  clientPointToNormalized,
  pickTopEditorObjectAtPoint,
} from "@/lib/editor-object-picking";
import {
  editorLayerHasPreciseShape,
  isApproximateEditorSelection,
} from "@/lib/editor-object-mask";
import { isPromptCreatedSubLayer } from "@/lib/editor-sub-object-layer";
import { animationProfileFromV6Preset } from "@/lib/editor-v6-motion-preview";
import type { LibraryDragPayload } from "@/lib/editor-v6-library-drag";
import { EditorCompositorOverlays } from "@/components/editor/editor-compositor-overlays";
import { EditorMotionPreviewOverlay } from "@/components/editor/editor-motion-preview-overlay";
import { EditorPartSelectionOverlay } from "@/components/editor/editor-part-selection-overlay";
import type {
  EditorCanvasDocument,
  EditorHierarchicalSelectionState,
  EditorObjectHierarchy,
  EditorPlacementItem,
  EditorShapePoint,
} from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  selectedLayerId: string | null;
  selectedPlacementId: string | null;
  showBodyGuide?: boolean;
  humanFirst?: boolean;
  onSelectLayer: (
    layerId: string,
    options?: { partId?: string | null; clickPoint?: EditorShapePoint }
  ) => void;
  onSelectPlacement: (placementId: string) => void;
  onMoveLayer: (layerId: string, x: number, y: number) => void;
  onMovePlacement: (placementId: string, x: number, y: number) => void;
  onResizePlacement: (placementId: string, width: number, height: number) => void;
  onScaleLayer?: (layerId: string, scale: number) => void;
  onRotateLayer?: (layerId: string, rotation: number) => void;
  lassoActive?: boolean;
  onLassoComplete?: (points: EditorShapePoint[]) => void;
  onLassoCancel?: () => void;
  preciseSelectActive?: boolean;
  preciseSelectMode?: PreciseSelectMode;
  preciseSelectLoading?: boolean;
  onPreciseSelectClick?: (point: EditorShapePoint, mode: PreciseSelectMode) => void;
  onPreciseSelectCancel?: () => void;
  hierarchicalSelection?: EditorHierarchicalSelectionState;
  objectHierarchies?: Record<string, EditorObjectHierarchy>;
  selectedPartId?: string | null;
  selectionRefining?: boolean;
  motionPreviewEnabled?: boolean;
  onLibraryAssetDrop?: (payload: LibraryDragPayload) => void;
  showAlignmentGuides?: boolean;
  selectedCompositorId?: string | null;
  onSelectCompositorLayer?: (compositorId: string) => void;
  onMoveCompositorLayer?: (compositorId: string, x: number, y: number) => void;
  onEmptyCanvasClick?: (point: EditorShapePoint) => void;
  onApproximateLayerClick?: (point: EditorShapePoint, parentLayerId: string) => void;
  segmenting?: boolean;
  clickFeedbackPoint?: EditorShapePoint | null;
  showSelectionHelp?: boolean;
};

export function EditorCanvasPreview({
  document,
  selectedLayerId,
  selectedPlacementId,
  showBodyGuide = false,
  humanFirst = false,
  onSelectLayer,
  onSelectPlacement,
  onMoveLayer,
  onMovePlacement,
  onResizePlacement,
  onScaleLayer,
  onRotateLayer,
  lassoActive = false,
  onLassoComplete,
  onLassoCancel,
  preciseSelectActive = false,
  preciseSelectMode = "initial",
  preciseSelectLoading = false,
  onPreciseSelectClick,
  onPreciseSelectCancel,
  hierarchicalSelection,
  objectHierarchies,
  selectedPartId = null,
  selectionRefining = false,
  motionPreviewEnabled = false,
  onLibraryAssetDrop,
  showAlignmentGuides = false,
  selectedCompositorId = null,
  onSelectCompositorLayer,
  onMoveCompositorLayer,
  onEmptyCanvasClick,
  onApproximateLayerClick,
  segmenting = false,
  clickFeedbackPoint = null,
  showSelectionHelp = true,
}: Props) {
  const t = useActiveTranslator();
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const visibleLayers = renderableEditorLayers({ objects: document.objects });
  const placements = visibleEditorPlacements(document).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const detectedObjects =
    document.detectedObjects ?? buildEditorObjectsFromLayers(document.objects);
  const hierarchies = objectHierarchies ?? document.objectHierarchies ?? {};
  const selection = hierarchicalSelection ?? document.hierarchicalSelection;

  const pickAtClient = (clientX: number, clientY: number, rect: DOMRect) => {
    const point = clientPointToNormalized(clientX, clientY, rect);
    if (selection) {
      const result = pickHierarchicalAtPoint(
        point,
        detectedObjects,
        hierarchies,
        selection,
        document.objects
      );
      if (result) {
        return {
          layerId: result.rootObject.layerId,
          partId: result.part?.id ?? null,
          clickPoint: point,
          result,
        };
      }
    }
    const hit = pickTopEditorObjectAtPoint(point, detectedObjects);
    return hit
      ? {
          layerId: hit.object.layerId,
          partId: null as string | null,
          clickPoint: point,
          result: null,
        }
      : null;
  };

  const activeHierarchy =
    selection?.rootObjectId ? hierarchies[selection.rootObjectId] : undefined;
  const selectedPart =
    selectedPartId && activeHierarchy
      ? activeHierarchy.parts.find((p) => p.id === selectedPartId)
      : null;
  const hoveredLayer =
    hoveredLayerId ? document.objects.find((o) => o.id === hoveredLayerId) : null;
  const interactiveCanvas =
    humanFirst && !lassoActive && !preciseSelectActive && !selectedPlacementId;

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-inner ${
        humanFirst ? "border border-zinc-300/80 ring-1 ring-black/5" : "border border-zinc-200"
      } ${interactiveCanvas ? "cursor-pointer" : ""}`}
      onPointerMove={(event) => {
        if (!humanFirst || lassoActive || preciseSelectActive) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const hit = pickAtClient(event.clientX, event.clientY, rect);
        setHoveredLayerId(hit?.layerId ?? null);
        if (selection?.mode === "part" && activeHierarchy) {
          const point = clientPointToNormalized(event.clientX, event.clientY, rect);
          const hovered = hoverPartsAtPoint(point, activeHierarchy);
          setHoveredPartId(hovered[0]?.id ?? null);
        } else {
          setHoveredPartId(null);
        }
      }}
      onPointerLeave={() => setHoveredLayerId(null)}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-homecheff-library-asset")) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        const raw = event.dataTransfer.getData("application/x-homecheff-library-asset");
        if (!raw || !onLibraryAssetDrop) {
          return;
        }
        event.preventDefault();
        try {
          onLibraryAssetDrop(JSON.parse(raw) as LibraryDragPayload);
        } catch {
          // ignore invalid payload
        }
      }}
      onPointerDown={(event) => {
        if (!humanFirst || lassoActive || preciseSelectActive || selectedPlacementId) {
          return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("[data-editor-transform-handle]")) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const hit = pickAtClient(event.clientX, event.clientY, rect);
        if (hit) {
          const layer = document.objects.find((o) => o.id === hit.layerId);
          const preciseSubLayer =
            layer &&
            isPromptCreatedSubLayer(layer) &&
            editorLayerHasPreciseShape(layer);
          const approximateParent = layer && isApproximateEditorSelection(layer);
          const estimatedTemplatePart = hit.partId && hit.result?.part?.estimatedBounds;

          if (preciseSubLayer || (layer && editorLayerHasPreciseShape(layer) && !approximateParent)) {
            onSelectLayer(hit.layerId, {
              partId: null,
              clickPoint: hit.clickPoint,
            });
            return;
          }

          if (approximateParent || estimatedTemplatePart) {
            onApproximateLayerClick?.(hit.clickPoint, hit.layerId);
            return;
          }

          onSelectLayer(hit.layerId, {
            partId: hit.partId,
            clickPoint: hit.clickPoint,
          });
          return;
        }
        onEmptyCanvasClick?.(clientPointToNormalized(event.clientX, event.clientY, rect));
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={document.backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute inset-0">
        <EditorCompositorOverlays
          document={document}
          selectedCompositorId={selectedCompositorId}
          onSelectCompositorLayer={onSelectCompositorLayer}
          onMoveCompositorLayer={onMoveCompositorLayer}
        />
      </div>
      <div className="pointer-events-none absolute inset-0">
        {visibleLayers.map((layer) => (
          <EditorSelectionOutline
            key={`outline-${layer.id}`}
            layer={layer}
            selected={selectedLayerId === layer.id && !selectedPartId}
            hovered={hoveredLayerId === layer.id && !hoveredPartId}
            humanFirst={humanFirst}
            refining={selectionRefining && selectedLayerId === layer.id && !selectedPartId}
          />
        ))}
        {selection?.mode === "part" && activeHierarchy ?
          <EditorPartSelectionOverlay
            parts={activeHierarchy.parts}
            hoveredPartId={hoveredPartId}
            selectedPartId={selectedPartId}
          />
        : null}
        {motionPreviewEnabled && selectedPart ?
          <EditorMotionPreviewOverlay
            bounds={selectedPart.bbox}
            profile={selectedPart.animationProfile}
            label={selectedPart.label}
          />
        : null}
        {document.productivityState?.motionPreviewLayerId &&
        document.productivityState.motionPreviewPreset &&
        selectedLayerId === document.productivityState.motionPreviewLayerId ?
          (() => {
            const layer = document.objects.find((o) => o.id === selectedLayerId);
            if (!layer) {
              return null;
            }
            return (
              <EditorMotionPreviewOverlay
                bounds={layer.bounds}
                profile={animationProfileFromV6Preset(document.productivityState!.motionPreviewPreset!)}
                label={layer.label}
                active
              />
            );
          })()
        : null}
        {showAlignmentGuides ?
          <>
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-[#0067B1]/30" />
            <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-[#0067B1]/30" />
          </>
        : null}
      </div>
      {lassoActive && onLassoComplete && onLassoCancel ?
        <EditorRefineLassoOverlay
          active={lassoActive}
          onComplete={onLassoComplete}
          onCancel={onLassoCancel}
        />
      : null}
      {preciseSelectActive && onPreciseSelectClick && onPreciseSelectCancel ?
        <EditorPreciseSelectOverlay
          active={preciseSelectActive}
          mode={preciseSelectMode}
          loading={preciseSelectLoading}
          onCanvasClick={onPreciseSelectClick}
          onCancel={onPreciseSelectCancel}
        />
      : null}
      {showBodyGuide && document.bodyDesigner ?
        <EditorBodyGuideOverlay params={document.bodyDesigner} layers={document.objects} />
      : null}
      {showSelectionHelp && interactiveCanvas && !segmenting ?
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3"
          role="status"
        >
          <p className="rounded-full bg-black/55 px-4 py-1.5 text-center text-sm font-medium text-white shadow-lg">
            {t("editor.canvas.clickToSelect" as never)}
          </p>
        </div>
      : null}
      {segmenting ?
        <div
          className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <p className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white shadow-lg animate-pulse">
            {t("editor.canvas.selecting" as never)}
          </p>
        </div>
      : null}
      {clickFeedbackPoint ?
        <div
          className="pointer-events-none absolute z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0067B1] shadow-md"
          style={{
            left: `${clickFeedbackPoint.x * 100}%`,
            top: `${clickFeedbackPoint.y * 100}%`,
          }}
          aria-hidden
        />
      : null}
      {humanFirst && hoveredLayer && !segmenting ?
        <div
          className="pointer-events-none absolute z-20 max-w-[70%] truncate rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white"
          style={{
            left: `${hoveredLayer.bounds.x * 100}%`,
            top: `${Math.max(0, hoveredLayer.bounds.y * 100 - 6)}%`,
          }}
        >
          {hoveredLayer.label}
        </div>
      : null}
      {visibleLayers.map((layer) => {
        const selected = selectedLayerId === layer.id && !selectedPlacementId;
        if (humanFirst && !selected) {
          return (
            <div
              key={`ghost-${layer.id}`}
              className="pointer-events-none absolute rounded-lg border border-dashed border-amber-400/40"
              style={{
                left: `${layer.bounds.x * 100}%`,
                top: `${layer.bounds.y * 100}%`,
                width: `${layer.bounds.width * 100}%`,
                height: `${layer.bounds.height * 100}%`,
                opacity: 0.45,
              }}
            />
          );
        }
        const canMove = isEditorOperationAllowed(layer, "move");
        const canScale = isEditorOperationAllowed(layer, "scale");
        const canRotate = isEditorOperationAllowed(layer, "rotate");
        const approximate = isApproximateEditorSelection(layer);
        const refining = selectionRefining && selected;
        const precise = !approximate;
        const estimated = approximate || (!humanFirst && layer.metadata?.estimatedBounds);
        const lowConfidence = !humanFirst && (layer.confidence ?? 1) < 0.55;
        const borderClass =
          refining
            ? "border-2 border-dashed border-zinc-400 animate-pulse"
            : precise
              ? "border-2 border-emerald-500"
              : "border-2 border-dashed border-zinc-400";
        const { x, y, scale, rotation } = layer.transform;
        return (
          <div
            key={layer.id}
            data-editor-transform-handle
            className={`absolute touch-none rounded-lg ${borderClass} ${canMove ? "cursor-move" : "cursor-pointer"}`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              width: `${layer.bounds.width * 100}%`,
              height: `${layer.bounds.height * 100}%`,
              opacity: humanFirst ? 1 : lowConfidence ? 0.72 : 0.85,
              zIndex: selected ? 5 : 1,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              const parentRect = event.currentTarget.parentElement?.getBoundingClientRect();
              const clickPoint = parentRect
                ? clientPointToNormalized(event.clientX, event.clientY, parentRect)
                : undefined;
              onSelectLayer(layer.id, { clickPoint });
              if (!canMove) {
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
              const startX = event.clientX;
              const startY = event.clientY;
              const origin = { x: layer.transform.x, y: layer.transform.y };
              const rect = event.currentTarget.parentElement?.getBoundingClientRect();
              if (!rect) {
                return;
              }
              const onMove = (moveEvent: PointerEvent) => {
                const dx = (moveEvent.clientX - startX) / rect.width;
                const dy = (moveEvent.clientY - startY) / rect.height;
                onMoveLayer(
                  layer.id,
                  Math.min(1, Math.max(0, origin.x + dx)),
                  Math.min(1, Math.max(0, origin.y + dy))
                );
              };
              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div
              className={`h-full w-full rounded-lg border-2 transition-colors ${
                approximate
                  ? selected
                    ? "border-amber-500 bg-amber-300/10"
                    : "border-dashed border-amber-400/70 bg-amber-200/5"
                  : selected
                    ? "border-[#0067B1] bg-[#0067B1]/10"
                    : layer.locked
                      ? "border-dashed border-zinc-400/50 bg-transparent"
                      : estimated
                        ? "border-amber-500/60 bg-amber-300/10"
                        : humanFirst
                          ? "border-white/70 bg-white/10 shadow-sm backdrop-blur-[1px]"
                          : "border-emerald-500/50 bg-emerald-300/10"
              }`}
            >
              {(selected || !humanFirst) && (
                <span className="absolute -top-5 left-0 max-w-full truncate text-[10px] font-semibold text-zinc-800">
                  {layer.label}
                  {approximate && selected ?
                    <span className="ml-1 font-normal text-amber-700">({t("editor.mask.approximateBadge")})</span>
                  : null}
                </span>
              )}
            </div>
            {humanFirst && selected && canScale && onScaleLayer ?
              <button
                type="button"
                data-editor-transform-handle
                aria-label={t("editor.human.action.resize")}
                className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full border-2 border-[#0067B1] bg-white shadow"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const startY = event.clientY;
                  const originScale = scale;
                  const onMoveEvent = (moveEvent: PointerEvent) => {
                    const dy = (moveEvent.clientY - startY) / 200;
                    onScaleLayer(layer.id, Math.min(2.5, Math.max(0.2, originScale + dy)));
                  };
                  const onUp = () => {
                    window.removeEventListener("pointermove", onMoveEvent);
                    window.removeEventListener("pointerup", onUp);
                  };
                  window.addEventListener("pointermove", onMoveEvent);
                  window.addEventListener("pointerup", onUp);
                }}
              />
            : null}
            {humanFirst && selected && canRotate && onRotateLayer ?
              <button
                type="button"
                data-editor-transform-handle
                aria-label={t("editor.human.toolbar.rotate")}
                className="absolute -top-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-[#0067B1] bg-white text-[10px] shadow"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const rect = event.currentTarget.parentElement?.getBoundingClientRect();
                  if (!rect) {
                    return;
                  }
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  const onMoveEvent = (moveEvent: PointerEvent) => {
                    const angle =
                      (Math.atan2(moveEvent.clientY - cy, moveEvent.clientX - cx) * 180) / Math.PI;
                    onRotateLayer(layer.id, angle);
                  };
                  const onUp = () => {
                    window.removeEventListener("pointermove", onMoveEvent);
                    window.removeEventListener("pointerup", onUp);
                  };
                  window.addEventListener("pointermove", onMoveEvent);
                  window.addEventListener("pointerup", onUp);
                }}
              >
                ↻
              </button>
            : null}
          </div>
        );
      })}
      {placements.map((placement) => (
        <PlacementOverlay
          key={placement.id}
          placement={placement}
          selected={selectedPlacementId === placement.id}
          humanFirst={humanFirst}
          t={t}
          onSelect={() => onSelectPlacement(placement.id)}
          onMove={(x, y) => onMovePlacement(placement.id, x, y)}
          onResize={(w, h) => onResizePlacement(placement.id, w, h)}
        />
      ))}
    </div>
  );
}

function PlacementOverlay({
  placement,
  selected,
  humanFirst,
  t,
  onSelect,
  onMove,
  onResize,
}: {
  placement: EditorPlacementItem;
  selected: boolean;
  humanFirst?: boolean;
  t: ReturnType<typeof useActiveTranslator>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}) {
  const locked = placement.canvasLocked;
  const { x, y, scale, rotation } = placement.canvasTransform;
  const width = (placement.canvasWidth ?? 0.2) * scale;
  const height = (placement.canvasHeight ?? 0.15) * scale;

  return (
    <div
      className={`absolute touch-none ${locked ? "cursor-not-allowed" : "cursor-move"}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        opacity: placement.opacity,
        zIndex: 10 + (placement.zIndex ?? 0),
      }}
      onPointerDown={(event) => {
        onSelect();
        if (locked) {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const origin = { x, y };
        const rect = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!rect) {
          return;
        }
        const onMoveEvent = (moveEvent: PointerEvent) => {
          const dx = (moveEvent.clientX - startX) / rect.width;
          const dy = (moveEvent.clientY - startY) / rect.height;
          onMove(Math.min(1, Math.max(0, origin.x + dx)), Math.min(1, Math.max(0, origin.y + dy)));
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMoveEvent);
          window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMoveEvent);
        window.addEventListener("pointerup", onUp);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={placement.previewUrl}
        alt={placement.sourceName}
        className={`h-full w-full object-contain ${selected ? "ring-2 ring-[#0067B1]" : ""}`}
        draggable={false}
      />
      {(!humanFirst || selected) && (
        <span className="absolute -top-5 left-0 flex max-w-full items-center gap-1 truncate text-[10px] font-semibold text-[#0067B1]">
          {placement.sourceName}
          {!humanFirst && placement.exactnessMode === "pixel_overlay" ?
            <span className="rounded bg-blue-100 px-1 text-[8px] uppercase">{t("editor.placement.exactBadge")}</span>
          : null}
        </span>
      )}
      {!locked ?
        <button
          type="button"
          aria-label={t("editor.placement.resizeHandle")}
          className="absolute -bottom-3 -right-3 h-11 w-11 rounded-full border-2 border-[#0067B1] bg-white shadow"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
            if (!rect) {
              return;
            }
            const startX = event.clientX;
            const startY = event.clientY;
            const startW = placement.canvasWidth ?? 0.2;
            const startH = placement.canvasHeight ?? 0.15;
            const onMoveEvent = (moveEvent: PointerEvent) => {
              const dw = (moveEvent.clientX - startX) / rect.width;
              const dh = (moveEvent.clientY - startY) / rect.height;
              onResize(Math.min(1, Math.max(0.05, startW + dw)), Math.min(1, Math.max(0.05, startH + dh)));
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMoveEvent);
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMoveEvent);
            window.addEventListener("pointerup", onUp);
          }}
        />
      : null}
    </div>
  );
}
