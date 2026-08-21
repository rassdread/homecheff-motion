/**
 * S2E — Canonical visual timeline from Studio scene durations.
 * Single clock for audio cues. Reuses buildSceneTimelineSegments.
 */

import {
  buildSceneTimelineSegments,
  totalDurationFromSegments,
} from "@/lib/studio-audio-mix-timeline";
import {
  STUDIO_AUDIO_TIMELINE_VERSION,
  type StudioVisualSceneSpan,
  type StudioVisualTimeline,
} from "@/types/studio-audio-timeline";
import { createHash } from "node:crypto";

export type VisualTimelineSceneInput = {
  id: string;
  order: number;
  durationSeconds: number;
  musicTransitionType?: string;
};

/**
 * Resolve canonical visual spans. Audio must reference these — never invent a second clock.
 */
export function resolveCanonicalVisualTimeline(input: {
  projectId: string;
  scenes: VisualTimelineSceneInput[];
  /** Optional per-scene duration overrides (e.g. dialogue EXTEND_SCENE). */
  durationOverridesMs?: Record<string, number>;
}): StudioVisualTimeline {
  const scenes = input.scenes.map((scene) => {
    const overrideMs = input.durationOverridesMs?.[scene.id];
    const durationSeconds =
      overrideMs !== undefined
        ? Math.max(0.5, overrideMs / 1000)
        : scene.durationSeconds;
    return { ...scene, durationSeconds };
  });

  const segments = buildSceneTimelineSegments(scenes);
  const sceneSpans: StudioVisualSceneSpan[] = segments.map((seg) => {
    const startMs = Math.round(seg.startSeconds * 1000);
    const visualDurationMs = Math.round(seg.durationSeconds * 1000);
    return {
      sceneId: seg.sceneId,
      order: seg.order,
      startMs,
      endMs: startMs + visualDurationMs,
      visualDurationMs,
      transitionInMs: 0,
      transitionOutMs: seg.transitionType === "hard_cut" ? 0 : 250,
    };
  });

  const totalDurationMs = Math.round(totalDurationFromSegments(segments) * 1000);

  return {
    version: STUDIO_AUDIO_TIMELINE_VERSION,
    projectId: input.projectId,
    totalDurationMs,
    sceneSpans,
    source: "scene_duration_seconds",
  };
}

export function visualTimelineHash(timeline: StudioVisualTimeline): string {
  const payload = timeline.sceneSpans
    .map((s) => `${s.sceneId}:${s.startMs}:${s.endMs}`)
    .join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export function shiftCuesAfterSceneDurationChange(input: {
  spansBefore: StudioVisualSceneSpan[];
  spansAfter: StudioVisualSceneSpan[];
  /** Cue times that are scene-relative (offset within scene). */
  sceneRelativeCues: Array<{ sceneId: string; offsetMs: number; durationMs: number }>;
}): Array<{ sceneId: string; startMs: number; endMs: number }> {
  const afterById = new Map(input.spansAfter.map((s) => [s.sceneId, s]));
  return input.sceneRelativeCues.map((cue) => {
    const span = afterById.get(cue.sceneId);
    if (!span) {
      return { sceneId: cue.sceneId, startMs: 0, endMs: cue.durationMs };
    }
    const startMs = span.startMs + cue.offsetMs;
    return {
      sceneId: cue.sceneId,
      startMs,
      endMs: startMs + cue.durationMs,
    };
  });
}
