import type { SubtitleTrackEntry, TimedVoiceSegment } from "@/types/studio-voice-execution";

export function buildSubtitleEntriesFromVoiceSegments(
  segments: TimedVoiceSegment[]
): SubtitleTrackEntry[] {
  return segments
    .filter((s) => s.text.trim())
    .map((s) => ({
      start: s.startSeconds,
      end: s.endSeconds,
      text: s.text.trim(),
      sceneId: s.sceneId,
    }));
}

export function formatSubtitleTimeSrt(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function buildSrtFromSubtitleEntries(entries: SubtitleTrackEntry[]): string {
  const lines: string[] = [];
  entries.forEach((entry, index) => {
    if (!entry.text.trim()) {
      return;
    }
    lines.push(String(index + 1));
    lines.push(
      `${formatSubtitleTimeSrt(entry.start)} --> ${formatSubtitleTimeSrt(entry.end)}`
    );
    lines.push(entry.text.trim());
    lines.push("");
  });
  return lines.join("\n").trim();
}

export function parseSubtitleEntriesJson(raw: unknown): SubtitleTrackEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const entries: SubtitleTrackEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    const start = typeof o.start === "number" && Number.isFinite(o.start) ? o.start : null;
    const end = typeof o.end === "number" && Number.isFinite(o.end) ? o.end : null;
    if (!text || start === null || end === null) {
      continue;
    }
    entries.push({
      start,
      end,
      text,
      sceneId: typeof o.sceneId === "string" ? o.sceneId : undefined,
    });
  }
  return entries;
}
