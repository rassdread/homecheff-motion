/**
 * Decisions for linking a storyboard or animation project to a film.
 * No database access.
 */

export type LinkDecision =
  | { ok: true; kind: "already_linked" | "attach" }
  | { ok: false; code: "confirmation_required" | "already_linked_other" | "linked_elsewhere" | "not_found" };

export function decideStoryboardCreate(currentStoryboardId: string | null): "create" | "reuse" {
  return currentStoryboardId ? "reuse" : "create";
}

export function decideLink(input: {
  currentId: string | null;
  targetId: string;
  targetOwned: boolean;
  otherFilmId: string | null;
  confirmed: boolean;
}): LinkDecision {
  if (!input.targetOwned) return { ok: false, code: "not_found" };
  if (input.currentId && input.currentId !== input.targetId) {
    return { ok: false, code: "already_linked_other" };
  }
  if (input.currentId === input.targetId) return { ok: true, kind: "already_linked" };
  if (input.otherFilmId) return { ok: false, code: "linked_elsewhere" };
  if (!input.confirmed) return { ok: false, code: "confirmation_required" };
  return { ok: true, kind: "attach" };
}

export function moveSceneId(sceneIds: string[], sceneId: string, direction: "up" | "down"): string[] | null {
  const index = sceneIds.indexOf(sceneId);
  if (index < 0) return null;
  const next = direction === "up" ? index - 1 : index + 1;
  if (next < 0 || next >= sceneIds.length) return sceneIds;
  const copy = [...sceneIds];
  const swapped = copy[next];
  copy[next] = copy[index]!;
  copy[index] = swapped!;
  return copy;
}

export type SubtitleLine = { start: number; end: number; text: string; sceneId?: string };

/** Replace one scene's Dutch line. Times are order placeholders, not a finished timeline. */
export function mergeSceneSubtitleLine(
  entries: SubtitleLine[],
  scene: { id: string; order: number },
  text: string,
): SubtitleLine[] {
  const kept = entries.filter((entry) => entry.sceneId !== scene.id);
  const trimmed = text.trim();
  if (!trimmed) return kept;
  return [
    ...kept,
    { sceneId: scene.id, text: trimmed, start: scene.order, end: scene.order + 1 },
  ];
}
