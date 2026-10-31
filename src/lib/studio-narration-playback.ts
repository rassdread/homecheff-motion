/**
 * Film narration playback uses the storyboard voice file already stored
 * for the project. The timeline clip keeps its script identity; each read
 * resolves a playable URL from that file and does not create another asset.
 */

export function ownedVoiceStorageKey(ownerId: string, storyboardId: string, storageKey: string): boolean {
  const owner = ownerId.trim();
  const board = storyboardId.trim();
  const key = storageKey.trim();
  if (!owner || !board || !key || key.includes("..")) return false;
  return key.startsWith(`studio/${owner}/storyboards/${board}/voice/`);
}

export function ownedNarrationAudioUrl(input: {
  ownerId: string;
  storyboardId: string;
  storageKey: string;
  audioUrl: string;
}): string | null {
  if (!ownedVoiceStorageKey(input.ownerId, input.storyboardId, input.storageKey)) return null;
  let url: URL;
  try {
    url = new URL(input.audioUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "blob.vercel-storage.com" && !host.endsWith(".blob.vercel-storage.com")) return null;
  let path = url.pathname;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (!path.includes(input.storageKey.trim())) return null;
  return url.toString();
}

export function narrationClipCarriesProjectAudio(input: {
  trackType: string;
  sourceKind: string;
  sourceId: string;
  storyboardId: string | null;
}): boolean {
  return input.trackType === "NARRATION"
    && input.sourceKind === "narration_script"
    && Boolean(input.storyboardId)
    && input.sourceId === input.storyboardId;
}

/** A narration clip stays active from its own start through its own end, including across a video cut. */
export function narrationPlayheadInsideClip(startMs: number, durationMs: number, playheadMs: number): boolean {
  return playheadMs >= startMs && playheadMs < startMs + durationMs;
}

/**
 * Keep an existing subtitle track when it contains any line that is not part of
 * the speech about to be saved. That protects a separate dialogue draft.
 */
export function canReplaceSubtitleTrack(existingTexts: string[], nextTexts: string[]): boolean {
  const existing = existingTexts.map((text) => text.trim()).filter(Boolean);
  if (existing.length === 0) return true;
  const next = new Set(nextTexts.map((text) => text.trim()).filter(Boolean));
  return existing.every((text) => next.has(text));
}

export function spokenNarrationSubtitle(spokenText: string, durationSeconds: number): Array<{ start: number; end: number; text: string }> {
  const text = spokenText.trim();
  if (!text || !(durationSeconds > 0)) return [];
  return [{ start: 0, end: durationSeconds, text }];
}
