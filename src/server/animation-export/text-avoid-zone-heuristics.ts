import type { TextAvoidZone } from "@/types/text-avoid-zone";

/** Soft avoid bands for 9:16 portrait — always on when vision is off. */
export function buildPortraitSubjectHeuristicZones(
  aspectRatio: string | null | undefined
): TextAvoidZone[] {
  const isPortrait =
    aspectRatio === "9:16" ||
    aspectRatio === "3:4" ||
    aspectRatio == null ||
    aspectRatio === "";

  if (!isPortrait) {
    return buildLandscapeSubjectHeuristicZones();
  }

  return [
    {
      type: "primary_subject",
      x: 0.25,
      y: 0.2,
      width: 0.5,
      height: 0.45,
      confidence: 0.55,
      source: "template_heuristic",
      weight: 0.55,
      label: "center_upper_body",
    },
    {
      type: "face",
      x: 0.3,
      y: 0.15,
      width: 0.4,
      height: 0.3,
      confidence: 0.6,
      source: "template_heuristic",
      weight: 0.65,
      label: "face_head_band",
    },
    {
      type: "person",
      x: 0.25,
      y: 0.4,
      width: 0.5,
      height: 0.35,
      confidence: 0.5,
      source: "template_heuristic",
      weight: 0.45,
      label: "lower_torso_band",
    },
  ];
}

function buildLandscapeSubjectHeuristicZones(): TextAvoidZone[] {
  return [
    {
      type: "primary_subject",
      x: 0.2,
      y: 0.15,
      width: 0.6,
      height: 0.7,
      confidence: 0.45,
      source: "template_heuristic",
      weight: 0.4,
      label: "center_subject_landscape",
    },
  ];
}

/** HomeCheff mascot styles — strengthen center body/face bands without ML. */
export function applyMascotHeuristicBoost(
  zones: TextAvoidZone[],
  options: {
    stylePreset?: string | null;
    chips?: string[] | null;
    projectTitle?: string | null;
  }
): { zones: TextAvoidZone[]; applied: boolean } {
  const preset = (options.stylePreset ?? "").toLowerCase();
  const chips = (options.chips ?? []).map((c) => c.toLowerCase());
  const title = (options.projectTitle ?? "").toLowerCase();

  const mascotLikely =
    preset.includes("food_promo") ||
    preset.includes("clean_business") ||
    preset.includes("mascot") ||
    chips.some((c) => c.includes("mascot") || c.includes("chef") || c.includes("garden")) ||
    title.includes("mascot") ||
    title.includes("chef");

  if (!mascotLikely) {
    return { zones, applied: false };
  }

  const boosted = zones.map((z) => {
    if (
      z.type === "face" ||
      z.type === "mascot" ||
      z.type === "primary_subject" ||
      z.label?.includes("face") ||
      z.label?.includes("upper_body")
    ) {
      return {
        ...z,
        type: z.type === "person" ? ("mascot" as const) : z.type,
        weight: Math.min(1, z.weight * 1.35),
        confidence: Math.min(1, z.confidence + 0.1),
        label: z.label ? `${z.label}_mascot_boost` : "mascot_boost",
      };
    }
    return z;
  });

  boosted.push({
    type: "mascot",
    x: 0.28,
    y: 0.18,
    width: 0.44,
    height: 0.42,
    confidence: 0.5,
    source: "manual_heuristic",
    weight: 0.7,
    label: "mascot_cartoon_center",
  });

  return { zones: boosted, applied: true };
}

/** Green apron / chef hat color heuristic from sampled frame (64×64 RGB). */
export function detectMascotColorHeuristicZones(
  pixels: Uint8Array | null,
  frameW: number,
  frameH: number
): TextAvoidZone[] {
  if (!pixels || pixels.length < frameW * frameH * 3) {
    return [];
  }

  let greenHits = 0;
  let whiteHits = 0;
  const total = frameW * frameH;

  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    if (g > 90 && g > r * 1.15 && g > b * 1.1) {
      greenHits++;
    }
    if (r > 200 && g > 200 && b > 200) {
      whiteHits++;
    }
  }

  const greenRatio = greenHits / total;
  const whiteRatio = whiteHits / total;
  const zones: TextAvoidZone[] = [];

  if (greenRatio > 0.08) {
    zones.push({
      type: "mascot",
      x: 0.3,
      y: 0.45,
      width: 0.4,
      height: 0.25,
      confidence: Math.min(0.75, 0.4 + greenRatio),
      source: "color_heuristic",
      weight: 0.55,
      label: "green_apron_region",
    });
  }

  if (whiteRatio > 0.06) {
    zones.push({
      type: "mascot",
      x: 0.32,
      y: 0.1,
      width: 0.36,
      height: 0.18,
      confidence: Math.min(0.7, 0.35 + whiteRatio),
      source: "color_heuristic",
      weight: 0.5,
      label: "chef_hat_region",
    });
  }

  return zones;
}
