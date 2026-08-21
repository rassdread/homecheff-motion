/**
 * S2E-P1 — Deterministic ducking envelope merge for FFmpeg execution.
 * 0 provider calls.
 */

export type DuckingEnvelopeSeconds = {
  startSeconds: number;
  endSeconds: number;
  musicGain: number;
  ambienceGain: number;
  attackSeconds: number;
  releaseSeconds: number;
};

/** Adjacent cues closer than this merge into one continuous duck (avoids pumping). */
export const DUCKING_MERGE_GAP_SECONDS = 0.25;

/**
 * Merge overlapping / near-adjacent envelopes.
 * Overlap: one duck period (min gain, not compounded).
 */
export function mergeDuckingEnvelopes(
  envelopes: DuckingEnvelopeSeconds[],
  mergeGapSeconds: number = DUCKING_MERGE_GAP_SECONDS
): DuckingEnvelopeSeconds[] {
  if (envelopes.length === 0) return [];
  const sorted = [...envelopes]
    .map((e) => ({
      ...e,
      startSeconds: Math.max(0, e.startSeconds),
      endSeconds: Math.max(e.startSeconds + 0.05, e.endSeconds),
    }))
    .sort((a, b) => a.startSeconds - b.startSeconds || a.endSeconds - b.endSeconds);

  const out: DuckingEnvelopeSeconds[] = [];
  let cur = { ...sorted[0]! };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    if (next.startSeconds <= cur.endSeconds + mergeGapSeconds) {
      cur = {
        startSeconds: cur.startSeconds,
        endSeconds: Math.max(cur.endSeconds, next.endSeconds),
        musicGain: Math.min(cur.musicGain, next.musicGain),
        ambienceGain: Math.min(cur.ambienceGain, next.ambienceGain),
        attackSeconds: Math.min(cur.attackSeconds, next.attackSeconds),
        releaseSeconds: Math.max(cur.releaseSeconds, next.releaseSeconds),
      };
    } else {
      out.push(cur);
      cur = { ...next };
    }
  }
  out.push(cur);
  return out;
}

/**
 * FFmpeg volume expression: base outside envelopes, base*gain inside.
 * Uses eval=frame; commas escaped for filter_complex.
 */
export function buildTimedVolumeExpression(params: {
  baseVolume: number;
  envelopes: DuckingEnvelopeSeconds[];
  gainKey: "musicGain" | "ambienceGain";
}): string {
  const base = Math.max(0, Math.min(2, params.baseVolume));
  const merged = mergeDuckingEnvelopes(params.envelopes);
  if (merged.length === 0) {
    return base.toFixed(3);
  }

  // Nest from the end: if(between(t,s,e), ducked, <rest>)
  let expr = base.toFixed(3);
  for (let i = merged.length - 1; i >= 0; i--) {
    const e = merged[i]!;
    const ducked = (base * Math.max(0, Math.min(1, e[params.gainKey]))).toFixed(3);
    const s = e.startSeconds.toFixed(3);
    const en = e.endSeconds.toFixed(3);
    expr = `if(between(t\\,${s}\\,${en})\\,${ducked}\\,${expr})`;
  }
  return expr;
}

export function buildTimedVolumeFilter(params: {
  baseVolume: number;
  envelopes: DuckingEnvelopeSeconds[];
  gainKey: "musicGain" | "ambienceGain";
}): string {
  const merged = mergeDuckingEnvelopes(params.envelopes);
  if (merged.length === 0) {
    return `volume=${params.baseVolume.toFixed(3)}`;
  }
  const expr = buildTimedVolumeExpression(params);
  return `volume=${expr}:eval=frame`;
}
