export type ClipDraftSource = {
  startMs: number;
  durationMs: number;
  inMs: number;
  volume: number;
};

export type ClipDraft = {
  startMs: string;
  durationMs: string;
  inMs: string;
  volume: string;
};

export function draftFromClip(clip: ClipDraftSource): ClipDraft {
  return {
    startMs: String(clip.startMs),
    durationMs: String(clip.durationMs),
    inMs: String(clip.inMs),
    volume: String(clip.volume),
  };
}

function whole(value: string): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null;
  return Number(value);
}

/** Changed fields only. An empty object means the draft already matches the clip. */
export function clipDraftPatch(
  clip: ClipDraftSource,
  draft: ClipDraft,
): { ok: true; patch: Record<string, number> } | { ok: false; field: "start" | "duration" | "in" | "volume" } {
  const startMs = whole(draft.startMs);
  const durationMs = whole(draft.durationMs);
  const inMs = whole(draft.inMs);
  const volume = whole(draft.volume);
  if (startMs == null || startMs < 0) return { ok: false, field: "start" };
  if (durationMs == null || durationMs < 1) return { ok: false, field: "duration" };
  if (inMs == null || inMs < 0) return { ok: false, field: "in" };
  if (volume == null || volume < 0 || volume > 100) return { ok: false, field: "volume" };
  const patch: Record<string, number> = {};
  if (startMs !== clip.startMs) patch.startMs = startMs;
  if (durationMs !== clip.durationMs) patch.durationMs = durationMs;
  if (inMs !== clip.inMs) patch.inMs = inMs;
  if (volume !== clip.volume) patch.volume = volume;
  return { ok: true, patch };
}
