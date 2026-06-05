import type { LockedTextLayer } from "@/lib/locked-text-layer";
import type { TextAvoidZone, TextAvoidZonePlan } from "@/types/text-avoid-zone";
import {
  estimateTextBoxNormalized,
  isTextBoxUnsafeForZones,
} from "@/server/animation-export/text-subject-collision";
import { buildTextAvoidZonePlan } from "@/server/animation-export/text-avoid-zone-builder";
import { logTextSubjectSafetyDebug } from "@/server/animation-export/text-avoid-zone-debug";
import {
  isTextBoxOverlappingPlaced,
  reservePlacedTextBox,
  resolveTextPlacementTwoPass,
  type PlacedTextBox,
} from "@/server/animation-export/text-placement-reservation";

export function normalizeLockedLayerCoords(
  layer: LockedTextLayer,
  frameW: number,
  frameH: number
): { x: number; y: number } {
  const x =
    layer.x <= 1 && layer.x >= 0
      ? Math.round(layer.x * frameW)
      : Math.round(layer.x);
  const y =
    layer.y <= 1 && layer.y >= 0
      ? Math.round(layer.y * frameH)
      : Math.round(layer.y);
  return { x, y };
}

function lockedLayerAlignment(layer: LockedTextLayer): number {
  return layer.textAlign === "left" ? 1 : layer.textAlign === "right" ? 3 : 2;
}

function alignmentToTextAlign(alignment: number): LockedTextLayer["textAlign"] {
  return alignment === 1 ? "left" : alignment === 3 ? "right" : "center";
}

/** Priority: earlier start, then higher on screen (lower y). */
function lockedLayerPlacementOrder(a: LockedTextLayer, b: LockedTextLayer): number {
  if (a.startMs !== b.startMs) {
    return a.startMs - b.startMs;
  }
  return a.y - b.y;
}

export function applySubjectSafetyToLockedLayers(input: {
  layers: LockedTextLayer[];
  frameW: number;
  frameH: number;
  avoidPlan: TextAvoidZonePlan;
}): LockedTextLayer[] {
  const zones = input.avoidPlan.zones;
  const active = input.layers.filter((l) => l.locked && l.text.trim());
  const sorted = [...active].sort(lockedLayerPlacementOrder);
  const placedReservations: PlacedTextBox[] = [];
  const updatedById = new Map<string, LockedTextLayer>();

  for (const layer of sorted) {
    const { x, y } = normalizeLockedLayerCoords(layer, input.frameW, input.frameH);
    const fontSize = layer.fontSize ?? Math.round(input.frameH * 0.045);
    const lines = layer.text.split("\n").filter(Boolean);
    const alignment = lockedLayerAlignment(layer);

    const proposed = estimateTextBoxNormalized({
      x,
      y,
      fontSize,
      frameW: input.frameW,
      frameH: input.frameH,
      lines: lines.length ? lines : [layer.text],
      alignment,
    });

    const needsSubjectMove = isTextBoxUnsafeForZones(proposed, zones);
    const needsTextMove = isTextBoxOverlappingPlaced(proposed, placedReservations);

    if (!needsSubjectMove && !needsTextMove) {
      placedReservations.push(
        reservePlacedTextBox({ layerId: layer.id, box: proposed })
      );
      updatedById.set(layer.id, layer);
      continue;
    }

    const resolved = resolveTextPlacementTwoPass({
      layerId: layer.id,
      x,
      y,
      fontSize,
      alignment,
      lines: lines.length ? lines : [layer.text],
      frameW: input.frameW,
      frameH: input.frameH,
      zones,
      placedReservations,
    });

    logTextSubjectSafetyDebug({
      layerId: layer.id,
      avoidZones: zones,
      proposedBox: proposed,
      chosenBox: resolved.box,
      rejected: resolved.rejected,
      action: resolved.action,
      placedReservations: placedReservations.map((r) => ({
        layerId: r.layerId,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      })),
    });

    placedReservations.push(
      reservePlacedTextBox({ layerId: layer.id, box: resolved.box })
    );

    updatedById.set(layer.id, {
      ...layer,
      x: resolved.x / input.frameW,
      y: resolved.y / input.frameH,
      fontSize: resolved.fontSize,
      textAlign: alignmentToTextAlign(resolved.alignment),
    });
  }

  return input.layers.map((layer) => updatedById.get(layer.id) ?? layer);
}

export function buildMultiImageAvoidPlan(input: {
  aspectRatio?: string | null;
  stylePreset?: string | null;
  chips?: string[] | null;
  projectTitle?: string | null;
}): TextAvoidZonePlan {
  return buildTextAvoidZonePlan({
    aspectRatio: input.aspectRatio,
    stylePreset: input.stylePreset,
    chips: input.chips,
    projectTitle: input.projectTitle,
    heuristicOnly: true,
  });
}

export function isPatchBboxUnsafe(
  bbox: { x: number; y: number; width: number; height: number },
  zones: TextAvoidZone[]
): boolean {
  const box = {
    left: bbox.x,
    top: bbox.y,
    right: bbox.x + bbox.width,
    bottom: bbox.y + bbox.height,
  };
  return isTextBoxUnsafeForZones(box, zones);
}
