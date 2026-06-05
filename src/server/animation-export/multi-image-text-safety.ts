import type { LockedTextLayer } from "@/lib/locked-text-layer";
import type { TextAvoidZone, TextAvoidZonePlan } from "@/types/text-avoid-zone";
import {
  estimateTextBoxNormalized,
  isTextBoxUnsafeForZones,
  relocateAwayFromSubjectZones,
} from "@/server/animation-export/text-subject-collision";
import { buildTextAvoidZonePlan } from "@/server/animation-export/text-avoid-zone-builder";
import { logTextSubjectSafetyDebug } from "@/server/animation-export/text-avoid-zone-debug";

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

export function applySubjectSafetyToLockedLayers(input: {
  layers: LockedTextLayer[];
  frameW: number;
  frameH: number;
  avoidPlan: TextAvoidZonePlan;
}): LockedTextLayer[] {
  const zones = input.avoidPlan.zones;
  const placedBoxes: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }> = [];

  return input.layers.map((layer) => {
    if (!layer.locked || !layer.text.trim()) {
      return layer;
    }

    const { x, y } = normalizeLockedLayerCoords(layer, input.frameW, input.frameH);
    const fontSize = layer.fontSize ?? Math.round(input.frameH * 0.045);
    const lines = layer.text.split("\n").filter(Boolean);
    const alignment =
      layer.textAlign === "left" ? 1 : layer.textAlign === "right" ? 3 : 2;

    const proposed = estimateTextBoxNormalized({
      x,
      y,
      fontSize,
      frameW: input.frameW,
      frameH: input.frameH,
      lines: lines.length ? lines : [layer.text],
      alignment,
    });

    if (!isTextBoxUnsafeForZones(proposed, zones)) {
      placedBoxes.push(proposed);
      return layer;
    }

    const relocated = relocateAwayFromSubjectZones({
      x,
      y,
      fontSize,
      alignment,
      lines: lines.length ? lines : [layer.text],
      frameW: input.frameW,
      frameH: input.frameH,
      zones,
    });

    logTextSubjectSafetyDebug({
      layerId: layer.id ?? layer.text.slice(0, 24),
      avoidZones: zones,
      proposedBox: proposed,
      chosenBox: relocated.box,
      rejected: [{ reason: "subject_overlap", score: 0 }],
      action: relocated.action,
    });

    placedBoxes.push(relocated.box);

    const textAlign =
      relocated.alignment === 1 ? "left"
      : relocated.alignment === 3 ? "right"
      : "center";

    return {
      ...layer,
      x: relocated.x / input.frameW,
      y: relocated.y / input.frameH,
      fontSize: relocated.fontSize,
      textAlign,
    };
  });
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
