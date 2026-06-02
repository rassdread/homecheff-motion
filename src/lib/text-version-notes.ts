/**
 * Text rerender version notes — stored on AnimationProject.instantTextVersionNotesJson.
 */

export type TextVersionNoteEntry = {
  version: number;
  note: string;
  createdAt: string;
};

export function parseTextVersionNotesJson(value: unknown): TextVersionNoteEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: TextVersionNoteEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const version = typeof row.version === "number" ? row.version : null;
    const note = typeof row.note === "string" ? row.note.trim() : "";
    if (version == null || !note) {
      continue;
    }
    rows.push({
      version,
      note,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    });
  }
  return rows.sort((a, b) => b.version - a.version);
}

export function findTextVersionNote(
  notes: TextVersionNoteEntry[],
  version: number
): string | null {
  return notes.find((row) => row.version === version)?.note?.trim() ?? null;
}

export function appendTextVersionNote(
  existing: unknown,
  entry: TextVersionNoteEntry
): TextVersionNoteEntry[] {
  const rows = parseTextVersionNotesJson(existing).filter((row) => row.version !== entry.version);
  rows.push(entry);
  return rows.sort((a, b) => b.version - a.version);
}
