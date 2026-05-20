/**
 * Temporal continuity system — coherent motion over time.
 */

import type { MotionMemoryState } from "@/lib/premium-motion-memory";

const TEMPORAL_CORE = `TEMPORAL CONTINUITY SYSTEM:
- One continuous performance arc across the clip — no random pose changes or expression resets.
- Gesture continuity: if a hand moves right, continue that momentum smoothly; no teleporting limbs.
- Emotional continuity: expression evolves gradually — no snapping between unrelated moods.
- Camera continuity: maintain direction and pacing — no sudden framing jumps or unstable zoom.
- Scene momentum: preserve subject facing, weight distribution, and acting energy between beats.
- Prevent: motion flicker, visual snapping, inconsistent timing, floating limbs, shape drift.`;

export function buildTemporalContinuityBlock(memory?: MotionMemoryState | null): string {
  if (!memory) {
    return TEMPORAL_CORE;
  }
  return `${TEMPORAL_CORE}

CONTINUITY MEMORY (this segment):
- Phase: ${memory.segmentPhase}; prior gestures exhausted: ${memory.priorGestureBeats.join(", ") || "none"}.
- Carry forward ${memory.emotionalContinuity.toLowerCase()}
- Camera: ${memory.cameraDirection.replace(/_/g, " ")}; mascot energy: ${memory.mascotEnergy}.`;
}
