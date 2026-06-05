/**
 * Story overlay ASS dialogue drafts — collect, resolve collisions, emit.
 */

import {
  alignmentForOverlayKind,
  boundsForCandidate,
  detectOverlayCollisions,
  overlayLayerPriority,
  type OverlayCollisionCandidate,
  type OverlayCollisionLayerKind,
} from "@/server/animation-export/story-overlay-collision";
import {
  bandAnchorY,
  defaultBandForOverlayKind,
  nextAlternateBand,
  STORY_LAYOUT_BAND_ORDER,
  type StoryLayoutBand,
} from "@/server/animation-export/story-overlay-layout-bands";
import { isStoryModeDebugEnabled } from "@/lib/story-mode-debug";
import type { TextAvoidZone } from "@/types/text-avoid-zone";
import {
  isTextBoxUnsafeForZones,
  relocateAwayFromSubjectZones,
} from "@/server/animation-export/text-subject-collision";
import { logTextSubjectSafetyDebug } from "@/server/animation-export/text-avoid-zone-debug";

export type StoryDialogueDraft = OverlayCollisionCandidate & {
  sceneIndex: number;
  styleName: string;
  /** ASS-ready text (escaped / accented). */
  assText: string;
  motionFinaleHold?: boolean;
  motionInstant?: boolean;
};

export type DialogueCollisionAction = {
  id: string;
  kind: OverlayCollisionLayerKind;
  action: "kept" | "moved" | "resized" | "shortened" | "hidden";
  reason: string;
  fontSize?: number;
  end?: number;
};

export type FinalizeSceneDialoguesResult = {
  events: string[];
  warnings: string[];
  actions: DialogueCollisionAction[];
  /** Visible drafts after collision resolution (for tests and debug). */
  resolvedDrafts: StoryDialogueDraft[];
};

function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.round((clamped - Math.floor(clamped)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function boxesOverlap(
  a: ReturnType<typeof boundsForCandidate>,
  b: ReturnType<typeof boundsForCandidate>,
  paddingPx = 12
): boolean {
  return !(
    a.right + paddingPx < b.left ||
    a.left - paddingPx > b.right ||
    a.bottom + paddingPx < b.top ||
    a.top - paddingPx > b.bottom
  );
}

function candidateFromDraft(draft: StoryDialogueDraft): OverlayCollisionCandidate {
  return {
    id: draft.id,
    kind: draft.kind,
    priority: overlayLayerPriority(draft.kind),
    x: draft.x,
    y: draft.y,
    alignment: draft.alignment,
    lines: draft.lines,
    fontSize: draft.fontSize,
    start: draft.start,
    end: draft.end,
    hidden: draft.hidden,
  };
}

function draftFromCandidate(
  draft: StoryDialogueDraft,
  candidate: OverlayCollisionCandidate
): StoryDialogueDraft {
  return {
    ...draft,
    x: candidate.x,
    y: candidate.y,
    fontSize: candidate.fontSize,
    start: candidate.start,
    end: candidate.end,
    hidden: candidate.hidden,
    lines: candidate.lines,
  };
}

function inferLayoutBand(y: number, frameHeight: number): StoryLayoutBand {
  let best: StoryLayoutBand = "center";
  let bestDist = Infinity;
  for (const band of STORY_LAYOUT_BAND_ORDER) {
    const dist = Math.abs(y - bandAnchorY(band, frameHeight));
    if (dist < bestDist) {
      bestDist = dist;
      best = band;
    }
  }
  return best;
}

function occupiedBands(
  placed: OverlayCollisionCandidate[],
  frameHeight: number
): Set<StoryLayoutBand> {
  const used = new Set<StoryLayoutBand>();
  for (const item of placed) {
    if (!item.hidden) {
      used.add(inferLayoutBand(item.y, frameHeight));
    }
  }
  return used;
}

/**
 * Resolve collisions with reposition (band) → shift → resize → shorten timing → hide.
 */
function normalizedBoxFromCandidate(
  candidate: OverlayCollisionCandidate,
  frameWidth: number,
  frameHeight: number
): { left: number; right: number; top: number; bottom: number } {
  const box = boundsForCandidate(candidate);
  return {
    left: box.left / frameWidth,
    top: box.top / frameHeight,
    right: box.right / frameWidth,
    bottom: box.bottom / frameHeight,
  };
}

export function resolveSceneDialogueCollisions(params: {
  drafts: StoryDialogueDraft[];
  frameWidth: number;
  frameHeight: number;
  minVerticalGapPx?: number;
  avoidZones?: TextAvoidZone[];
}): FinalizeSceneDialoguesResult {
  const sorted = [...params.drafts].sort(
    (a, b) => overlayLayerPriority(b.kind) - overlayLayerPriority(a.kind)
  );
  const warnings: string[] = [];
  const actions: DialogueCollisionAction[] = [];
  const placed: OverlayCollisionCandidate[] = [];
  const minGap = params.minVerticalGapPx ?? 24;

  for (const draft of sorted) {
    if (!draft.assText.trim() || draft.lines.every((l) => !l.trim())) {
      continue;
    }

    let working = candidateFromDraft(draft);
    let action: DialogueCollisionAction["action"] = "kept";
    let reason = "no_collision";
    const triedBands = new Set<StoryLayoutBand>([
      inferLayoutBand(working.y, params.frameHeight),
    ]);

    if (params.avoidZones && params.avoidZones.length > 0) {
      const subjectRelocated = relocateAwayFromSubjectZones({
        x: working.x,
        y: working.y,
        fontSize: working.fontSize,
        alignment: working.alignment,
        lines: working.lines,
        frameW: params.frameWidth,
        frameH: params.frameHeight,
        zones: params.avoidZones,
      });
      if (subjectRelocated.action !== "kept") {
        working = {
          ...working,
          x: subjectRelocated.x,
          y: subjectRelocated.y,
          fontSize: subjectRelocated.fontSize,
          alignment: subjectRelocated.alignment,
        };
        action = "moved";
        reason = `subject_safe_${subjectRelocated.action}`;
        logTextSubjectSafetyDebug({
          layerId: draft.id,
          avoidZones: params.avoidZones,
          proposedBox: normalizedBoxFromCandidate(candidateFromDraft(draft), params.frameWidth, params.frameHeight),
          chosenBox: subjectRelocated.box,
          rejected: [{ reason: "subject_overlap", score: 0 }],
          action: subjectRelocated.action,
        });
      }
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const box = boundsForCandidate(working);
      let hit: OverlayCollisionCandidate | null = null;
      for (const other of placed) {
        if (other.hidden) {
          continue;
        }
        const timeOverlap = working.start < other.end && other.start < working.end;
        if (!timeOverlap) {
          continue;
        }
        if (boxesOverlap(box, boundsForCandidate(other))) {
          hit = other;
          break;
        }
      }

      const subjectUnsafe =
        params.avoidZones &&
        params.avoidZones.length > 0 &&
        isTextBoxUnsafeForZones(
          normalizedBoxFromCandidate(working, params.frameWidth, params.frameHeight),
          params.avoidZones
        );

      if (!hit && !subjectUnsafe) {
        break;
      }

      if (!hit && subjectUnsafe) {
        const subjectRelocated = relocateAwayFromSubjectZones({
          x: working.x,
          y: working.y,
          fontSize: working.fontSize,
          alignment: working.alignment,
          lines: working.lines,
          frameW: params.frameWidth,
          frameH: params.frameHeight,
          zones: params.avoidZones!,
        });
        if (subjectRelocated.action !== "kept") {
          working = {
            ...working,
            x: subjectRelocated.x,
            y: subjectRelocated.y,
            fontSize: subjectRelocated.fontSize,
            alignment: subjectRelocated.alignment,
          };
          action = "moved";
          reason = `subject_relocate_${subjectRelocated.action}`;
          continue;
        }
      }

      if (!hit) {
        break;
      }

      const usedBands = occupiedBands(placed, params.frameHeight);
      for (const band of triedBands) {
        usedBands.add(band);
      }
      const startBand = defaultBandForOverlayKind(working.kind);
      const altBand = nextAlternateBand(startBand, usedBands);
      if (altBand && !triedBands.has(altBand)) {
        triedBands.add(altBand);
        working = { ...working, y: bandAnchorY(altBand, params.frameHeight) };
        action = "moved";
        reason = `repositioned_to_band_${altBand}`;
        continue;
      }

      const otherBox = boundsForCandidate(hit);
      const shiftDown = otherBox.bottom - box.top + minGap;
      if (shiftDown > 0 && shiftDown < params.frameHeight * 0.42) {
        working = { ...working, y: working.y + shiftDown };
        action = "moved";
        reason = `repositioned_below_${hit.kind}`;
        continue;
      }

      const shrunk = Math.round(working.fontSize * 0.88);
      if (shrunk >= Math.round(working.fontSize * 0.55) && shrunk < working.fontSize) {
        working = { ...working, fontSize: shrunk };
        action = "resized";
        reason = `reduced_font_below_${hit.kind}`;
        continue;
      }

      if (hit.start > working.start + 0.2) {
        working = { ...working, end: Math.max(working.start + 0.15, hit.start) };
        action = "shortened";
        reason = `shortened_visible_until_${hit.kind}`;
        const boxAfter = boundsForCandidate(working);
        let stillHits = false;
        for (const other of placed) {
          if (other.hidden) {
            continue;
          }
          const tOverlap = working.start < other.end && other.start < working.end;
          if (tOverlap && boxesOverlap(boxAfter, boundsForCandidate(other))) {
            stillHits = true;
            break;
          }
        }
        if (!stillHits) {
          break;
        }
      }

      working = { ...working, hidden: true };
      action = "hidden";
      reason = `hidden_overlap_with_${hit.kind}`;
      warnings.push(`hidden:${working.kind}:${reason}`);
      break;
    }

    if (!working.hidden) {
      placed.push(working);
    }

    actions.push({
      id: draft.id,
      kind: draft.kind,
      action,
      reason,
      fontSize: working.fontSize,
      end: working.end,
    });
  }

  const resolvedMap = new Map<string, OverlayCollisionCandidate>();
  for (const d of params.drafts) {
    resolvedMap.set(d.id, candidateFromDraft(d));
  }
  for (const p of placed) {
    resolvedMap.set(p.id, p);
  }
  for (const a of actions) {
    if (a.action === "hidden") {
      const cur = resolvedMap.get(a.id);
      if (cur) {
        resolvedMap.set(a.id, { ...cur, hidden: true });
      }
    } else {
      const cur = resolvedMap.get(a.id);
      if (cur) {
        resolvedMap.set(a.id, {
          ...cur,
          fontSize: a.fontSize ?? cur.fontSize,
          end: a.end ?? cur.end,
          hidden: false,
        });
      }
    }
  }

  const resolvedDrafts = params.drafts
    .map((d) => {
      const c = resolvedMap.get(d.id);
      return c ? draftFromCandidate(d, c) : d;
    })
    .filter((d) => !d.hidden);

  const activeCandidates = resolvedDrafts.map(candidateFromDraft);
  warnings.push(...detectOverlayCollisions(activeCandidates));

  if (isStoryModeDebugEnabled() && actions.some((a) => a.action !== "kept")) {
    console.info("[hc-story-overlay-collision]", {
      sceneIndex: params.drafts[0]?.sceneIndex,
      actions,
      warnings,
    });
  }

  return {
    events: emitDialogueDrafts(resolvedDrafts),
    warnings,
    actions,
    resolvedDrafts,
  };
}

export function emitDialogueDrafts(drafts: StoryDialogueDraft[]): string[] {
  const lines: string[] = [];
  for (const draft of drafts) {
    if (draft.hidden || !draft.assText.trim()) {
      continue;
    }
    const tags = motionTagsForDraft(draft);
    lines.push(
      `Dialogue: 0,${assTime(draft.start)},${assTime(draft.end)},${draft.styleName},,0,0,0,,${tags}${draft.assText}`
    );
  }
  return lines;
}

function motionTagsForDraft(draft: StoryDialogueDraft): string {
  const yFrom = draft.y + 28;
  const fadeInMs = draft.motionInstant ? 0 : 220;
  const fadeOutMs = draft.motionFinaleHold ? 0 : 220;
  const scalePulse = `{\\t(0,480,\\fscx102\\fscy102)`;
  if (draft.motionInstant) {
    return `{\\fad(${fadeInMs},${fadeOutMs})${scalePulse}\\pos(${draft.x},${draft.y})}`;
  }
  return `{\\fad(${fadeInMs},${fadeOutMs})\\move(${draft.x},${yFrom},${draft.x},${draft.y},0,420)${scalePulse}\\pos(${draft.x},${draft.y})}`;
}

export function makeDialogueDraft(params: {
  id: string;
  kind: OverlayCollisionLayerKind;
  sceneIndex: number;
  styleName: string;
  assText: string;
  lines: string[];
  x: number;
  y: number;
  alignment?: number;
  fontSize: number;
  start: number;
  end: number;
  motionFinaleHold?: boolean;
  motionInstant?: boolean;
}): StoryDialogueDraft {
  return {
    id: params.id,
    kind: params.kind,
    priority: overlayLayerPriority(params.kind),
    sceneIndex: params.sceneIndex,
    styleName: params.styleName,
    assText: params.assText,
    lines: params.lines,
    x: params.x,
    y: params.y,
    alignment: params.alignment ?? alignmentForOverlayKind(params.kind),
    fontSize: params.fontSize,
    start: params.start,
    end: params.end,
    motionFinaleHold: params.motionFinaleHold,
    motionInstant: params.motionInstant,
  };
}

/** Test helper: verify no spatial overlap among visible drafts at overlapping times. */
export function assertNoDialogueOverlap(
  drafts: StoryDialogueDraft[],
  paddingPx = 12
): { ok: true } | { ok: false; pairs: string[] } {
  const active = drafts.filter((d) => !d.hidden && d.assText.trim());
  const pairs: string[] = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]!;
      const b = active[j]!;
      if (a.start >= b.end || b.start >= a.end) {
        continue;
      }
      if (boxesOverlap(boundsForCandidate(candidateFromDraft(a)), boundsForCandidate(candidateFromDraft(b)), paddingPx)) {
        pairs.push(`${a.kind}+${b.kind}`);
      }
    }
  }
  return pairs.length === 0 ? { ok: true } : { ok: false, pairs };
}
