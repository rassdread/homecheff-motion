/**
 * Story overlay collision detection — ASS text bounding boxes.
 */

import { hasFooterContent } from "@/lib/footer-lines";
import { assTextBounds, STORY_HEADLINE_ASS_ALIGNMENT, STORY_SUBTITLE_ASS_ALIGNMENT, STORY_TITLE_ASS_ALIGNMENT } from "@/server/animation-export/story-layer-placement";

export type OverlayCollisionLayerKind =
  | "hero"
  | "headline"
  | "title"
  | "subtitle"
  | "extra"
  | "sequence_line"
  | "hero_finale"
  | "finale_footer";

export type OverlayCollisionCandidate = {
  id: string;
  kind: OverlayCollisionLayerKind;
  priority: number;
  x: number;
  y: number;
  alignment: number;
  lines: string[];
  fontSize: number;
  start: number;
  end: number;
  hidden?: boolean;
};

const PRIORITY: Record<OverlayCollisionLayerKind, number> = {
  hero: 100,
  hero_finale: 95,
  headline: 80,
  title: 70,
  sequence_line: 65,
  subtitle: 50,
  extra: 40,
  finale_footer: 35,
};

export function overlayLayerPriority(kind: OverlayCollisionLayerKind): number {
  return PRIORITY[kind] ?? 30;
}

function boxesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
  paddingPx = 12
): boolean {
  return !(
    a.right + paddingPx < b.left ||
    a.left - paddingPx > b.right ||
    a.bottom + paddingPx < b.top ||
    a.top - paddingPx > b.bottom
  );
}

export function boundsForCandidate(candidate: OverlayCollisionCandidate): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  return assTextBounds({
    x: candidate.x,
    y: candidate.y,
    alignment: candidate.alignment,
    lines: candidate.lines,
    fontSize: candidate.fontSize,
  });
}

export function detectOverlayCollisions(
  candidates: OverlayCollisionCandidate[]
): string[] {
  const warnings: string[] = [];
  const active = candidates.filter((c) => !c.hidden && c.lines.some((l) => l.trim()));

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]!;
      const b = active[j]!;
      const timeOverlap = a.start < b.end && b.start < a.end;
      if (!timeOverlap) {
        continue;
      }
      const aBox = boundsForCandidate(a);
      const bBox = boundsForCandidate(b);
      if (boxesOverlap(aBox, bBox)) {
        warnings.push(
          `collision:${a.kind}+${b.kind} scenes overlap ${a.start.toFixed(2)}-${a.end.toFixed(2)} vs ${b.start.toFixed(2)}-${b.end.toFixed(2)}`
        );
      }
    }
  }
  return warnings;
}

export function resolveOverlayCollisions(params: {
  candidates: OverlayCollisionCandidate[];
  frameWidth: number;
  frameHeight: number;
  minVerticalGapPx?: number;
}): {
  candidates: OverlayCollisionCandidate[];
  warnings: string[];
  actions: Array<{ id: string; action: "kept" | "moved" | "hidden"; reason: string }>;
} {
  const minGap = params.minVerticalGapPx ?? 24;
  const sorted = [...params.candidates].sort(
    (a, b) => overlayLayerPriority(b.kind) - overlayLayerPriority(a.kind)
  );
  const warnings: string[] = [];
  const actions: Array<{ id: string; action: "kept" | "moved" | "hidden"; reason: string }> = [];

  const placed: OverlayCollisionCandidate[] = [];

  for (const candidate of sorted) {
    if (candidate.hidden || !candidate.lines.some((l) => l.trim())) {
      continue;
    }

    let working = { ...candidate };
    let action: "kept" | "moved" | "hidden" = "kept";
    let reason = "no_collision";

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const box = boundsForCandidate(working);
      let hit: OverlayCollisionCandidate | null = null;
      for (const other of placed) {
        if (!other.hidden && boxesOverlap(box, boundsForCandidate(other))) {
          const timeOverlap = working.start < other.end && other.start < working.end;
          if (timeOverlap) {
            hit = other;
            break;
          }
        }
      }
      if (!hit) {
        break;
      }

      const otherBox = boundsForCandidate(hit);
      const shiftDown = otherBox.bottom - box.top + minGap;
      if (shiftDown > 0 && shiftDown < params.frameHeight * 0.45) {
        working = { ...working, y: working.y + shiftDown };
        action = "moved";
        reason = `repositioned_below_${hit.kind}`;
      } else {
        working = { ...working, hidden: true };
        action = "hidden";
        reason = `hidden_below_priority_${hit.kind}`;
        warnings.push(`hidden:${working.kind} due to overlap with ${hit.kind}`);
        break;
      }
    }

    if (!working.hidden) {
      placed.push(working);
    }
    actions.push({ id: working.id, action, reason });
  }

  const outMap = new Map(sorted.map((c) => [c.id, c]));
  for (const placedItem of placed) {
    outMap.set(placedItem.id, placedItem);
  }
  for (const action of actions) {
    if (action.action === "hidden") {
      const cur = outMap.get(action.id);
      if (cur) {
        outMap.set(action.id, { ...cur, hidden: true });
      }
    }
  }

  const resolved = params.candidates.map((c) => outMap.get(c.id) ?? c);
  warnings.push(...detectOverlayCollisions(resolved.filter((c) => !c.hidden)));

  return { candidates: resolved, warnings, actions };
}

export function chooseFinaleChannel(scene: {
  heroFinaleText: string;
  finaleFooter?: string;
  footerLines?: string[];
  template: string;
}): "hero_finale" | "finale_footer" | "none" | "both_separate" {
  const hasHero = scene.heroFinaleText.trim().length > 0;
  const hasFooter = hasFooterContent(scene);
  if (!hasHero && !hasFooter) {
    return "none";
  }
  if (hasHero && hasFooter) {
    return "both_separate";
  }
  if (hasHero) {
    return "hero_finale";
  }
  return "finale_footer";
}

export function alignmentForOverlayKind(kind: OverlayCollisionLayerKind): number {
  if (kind === "headline") {
    return STORY_HEADLINE_ASS_ALIGNMENT;
  }
  if (kind === "finale_footer") {
    return 2;
  }
  return STORY_TITLE_ASS_ALIGNMENT;
}
