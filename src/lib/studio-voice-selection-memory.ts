/**
 * Character voice selection memory — stored in voiceNotes without schema migration.
 */

export type VoiceSelectionMemory = {
  selectedAt: string;
  profileRef: string;
  voiceName: string;
  compatibilityScore: number;
  matchedAccentId: string | null;
  matchedAccentLabelKey: string | null;
  personaPresetId: string | null;
  personaLabelKey: string | null;
  matchingReasons: string[];
};

const MEMORY_MARKER = "[hc:voice-selection]";

export function formatVoiceSelectionMemory(memory: VoiceSelectionMemory): string {
  return `${MEMORY_MARKER}\n${JSON.stringify(memory)}`;
}

export function parseVoiceSelectionMemory(voiceNotes: string): VoiceSelectionMemory | null {
  const idx = voiceNotes.indexOf(MEMORY_MARKER);
  if (idx === -1) {
    return null;
  }
  const body = voiceNotes.slice(idx + MEMORY_MARKER.length).trim();
  const lineEnd = body.indexOf("\n\n");
  const jsonText = lineEnd === -1 ? body : body.slice(0, lineEnd);
  try {
    const parsed = JSON.parse(jsonText) as VoiceSelectionMemory;
    if (!parsed || typeof parsed !== "object" || !parsed.profileRef) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function appendVoiceSelectionMemory(
  existingNotes: string,
  memory: VoiceSelectionMemory
): string {
  const withoutPrevious = existingNotes
    .split("\n")
    .filter((line) => !line.startsWith(MEMORY_MARKER))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const block = formatVoiceSelectionMemory(memory);
  return withoutPrevious ? `${withoutPrevious}\n\n${block}` : block;
}
