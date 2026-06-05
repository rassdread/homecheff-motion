import type { AvoidBox } from "@/server/animation-export/local-vision/types";
import type { TextAvoidZone, TextAvoidZonePlan } from "@/types/text-avoid-zone";
import {
  applyMascotHeuristicBoost,
  buildPortraitSubjectHeuristicZones,
  detectMascotColorHeuristicZones,
} from "@/server/animation-export/text-avoid-zone-heuristics";
import { mergeStoryAvoidBoxes } from "@/server/animation-export/story-overlay-avoid-zones";

function avoidBoxToZone(box: AvoidBox): TextAvoidZone {
  const label = (box.label ?? "").toLowerCase();
  let type: TextAvoidZone["type"] = "primary_subject";
  let source: TextAvoidZone["source"] = "manual_heuristic";

  if (label.includes("face")) {
    type = "face";
    source = "mediapipe";
  } else if (label.includes("hand")) {
    type = "hand";
    source = "mediapipe";
  } else if (label.includes("person") || label.includes("body")) {
    type = "person";
    source = "mediapipe";
  } else if (label.includes("mascot") || label.includes("chef") || label.includes("garden")) {
    type = "mascot";
    source = "manual_heuristic";
  } else if (label.includes("product")) {
    type = "product";
    source = "rtdetr";
  } else if (label.includes("logo") || label.includes("sign")) {
    type = "logo";
    source = "rtdetr";
  } else if (label.includes("ocr")) {
    type = "existing_text";
    source = "ocr";
  } else if (label.includes("center_head")) {
    type = "face";
    source = "template_heuristic";
  }

  const weight =
    type === "face"
      ? 0.85
      : type === "hand"
        ? 0.75
        : type === "mascot"
          ? 0.8
          : type === "product"
            ? 0.7
            : type === "existing_text"
              ? 0.65
              : 0.55;

  return {
    type,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    confidence: box.confidence ?? 0.6,
    source,
    weight,
    label: box.label,
  };
}

/** Union overlapping zones of same type by taking bounding envelope (simple merge). */
export function unionTextAvoidZones(zones: TextAvoidZone[]): TextAvoidZone[] {
  if (zones.length <= 1) {
    return zones;
  }

  const merged: TextAvoidZone[] = [];
  const used = new Set<number>();

  for (let i = 0; i < zones.length; i++) {
    if (used.has(i)) continue;
    let acc = { ...zones[i]! };
    used.add(i);

    for (let j = i + 1; j < zones.length; j++) {
      if (used.has(j)) continue;
      const other = zones[j]!;
      const overlap = zoneOverlapFraction(acc, other);
      if (acc.type === other.type && overlap > 0.05) {
        const x1 = Math.min(acc.x, other.x);
        const y1 = Math.min(acc.y, other.y);
        const x2 = Math.max(acc.x + acc.width, other.x + other.width);
        const y2 = Math.max(acc.y + acc.height, other.y + other.height);
        acc = {
          ...acc,
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
          confidence: Math.max(acc.confidence, other.confidence),
          weight: Math.max(acc.weight, other.weight),
        };
        used.add(j);
      }
    }
    merged.push(acc);
  }

  return merged;
}

export function zoneOverlapFraction(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const areaA = a.width * a.height;
  return areaA > 0 ? inter / areaA : 0;
}

export function textBoxOverlapWithZones(
  box: { left: number; right: number; top: number; bottom: number },
  zones: TextAvoidZone[]
): number {
  const norm = {
    x: box.left,
    y: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
  };
  let maxWeighted = 0;
  for (const zone of zones) {
    const overlap = zoneOverlapFraction(norm, zone);
    if (overlap <= 0) continue;
    const weighted = overlap * zone.weight * zone.confidence;
    if (weighted > maxWeighted) {
      maxWeighted = weighted;
    }
  }
  return maxWeighted;
}

export function buildTextAvoidZonePlan(input: {
  avoidBoxes?: AvoidBox[][];
  aspectRatio?: string | null;
  stylePreset?: string | null;
  chips?: string[] | null;
  projectTitle?: string | null;
  samplePixels?: Uint8Array | null;
  sampleFrameW?: number;
  sampleFrameH?: number;
  sampleTimesSec?: number[];
  heuristicOnly?: boolean;
}): TextAvoidZonePlan {
  const flatBoxes = mergeStoryAvoidBoxes(...(input.avoidBoxes ?? []));
  const fromDetection = flatBoxes.map(avoidBoxToZone);
  const heuristics = buildPortraitSubjectHeuristicZones(input.aspectRatio);

  let zones = unionTextAvoidZones([...fromDetection, ...heuristics]);

  if (input.samplePixels) {
    const colorZones = detectMascotColorHeuristicZones(
      input.samplePixels,
      input.sampleFrameW ?? 64,
      input.sampleFrameH ?? 64
    );
    zones = unionTextAvoidZones([...zones, ...colorZones]);
  }

  const mascot = applyMascotHeuristicBoost(zones, {
    stylePreset: input.stylePreset,
    chips: input.chips,
    projectTitle: input.projectTitle,
  });
  zones = unionTextAvoidZones(mascot.zones);

  return {
    zones,
    sampleTimesSec: input.sampleTimesSec ?? [],
    heuristicOnly: input.heuristicOnly ?? fromDetection.length === 0,
    mascotBoostApplied: mascot.applied,
  };
}

export function avoidBoxesToTextAvoidZones(boxes: AvoidBox[]): TextAvoidZone[] {
  return boxes.map(avoidBoxToZone);
}
