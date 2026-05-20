/**
 * Advanced foreground segmentation intelligence — layered motion targeting for Vidu.
 */

import type { ForegroundSegmentLayer, ForegroundSegmentRole } from "@/lib/premium-foreground-segmentation";
import { sortLayersBySubjectPriority } from "@/lib/premium-foreground-segmentation";

const SUBJECT_STABILITY_BLOCK = `SUBJECT STABILITY:
- Prevent body deformation, shape drift, floating limbs, and morphing objects.
- Preserve silhouette integrity on mascots, faces, hands, and products.
- Foreground subjects move as cohesive units — not rubbery warp or AI melt.`;

const LAYERED_MOTION_BLOCK = `LAYERED MOTION PRIORITY:
- FOREGROUND (mascots, faces, hands, products, props): expressive alive motion.
- BACKGROUND (environment, crowd ambient): subtle environmental motion only — never steal focus.
- UI / text / logo regions: completely static — zero drift or morph.`;

const FEATHERING_BLOCK = `MASK & EDGE QUALITY:
- Soft feathered edges on subject masks — no hard cutout feeling, no mask flicker, no edge jitter.
- Stable alpha boundaries across frames; avoid halo pulsing around hair and hands.`;

const SEGMENTATION_ROLES_GUIDE: Record<ForegroundSegmentRole, string> = {
  foreground_mascot: "Mascot: primary expressive motion on face, hands, body.",
  foreground_character: "Character: performance motion on face and gesture.",
  foreground_hand: "Hands: isolated gesture detail; natural finger articulation.",
  headline_object: "Hero product: subtle premium motion, no label morph.",
  foreground_prop: "Props: light secondary motion tied to subject.",
  phone: "Device: minimal drift; screen content static.",
  ui_card: "UI card: static preserve.",
  logo: "Logo: static preserve.",
  text: "Typography: static preserve.",
  floating_ui: "Floating UI: static preserve.",
  background_static: "Background: ambient parallax/drift only.",
  particle_fx: "Particles: subtle FX only on approved regions.",
  generated_fx: "Generated FX: subtle, subject-adjacent only.",
};

export function buildForegroundSegmentationPromptBlock(layers?: ForegroundSegmentLayer[]): string {
  const parts: string[] = [
    "ADVANCED FOREGROUND SEGMENTATION:",
    LAYERED_MOTION_BLOCK,
    FEATHERING_BLOCK,
    SUBJECT_STABILITY_BLOCK,
    `Separate motion targets: ${Object.keys(SEGMENTATION_ROLES_GUIDE).slice(0, 8).join(", ")}.`,
    "Future-ready: heuristic, rembg, SAM2, manual masks, depth maps — prioritize correct subject isolation.",
  ];

  if (layers?.length) {
    const sorted = sortLayersBySubjectPriority(layers).filter((l) => l.regionKind === "animated");
    const animated = sorted.slice(0, 5).map((l) => SEGMENTATION_ROLES_GUIDE[l.role] ?? l.role);
    if (animated.length) {
      parts.push(`ACTIVE LAYERS THIS FRAME:\n${animated.map((a) => `- ${a}`).join("\n")}`);
    }
  }

  return parts.join("\n\n");
}
