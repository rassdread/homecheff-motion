/**
 * Client bridge from a StudioCreativeProject workspace to the existing
 * assistant sidebar. This is not a second conversation store and not a
 * HomeCheff animation project id.
 */

import type { StudioV23SceneContext } from "@/lib/studio-v23-actions";

export type StudioFilmAssistantContext = {
  projectType: "creative_film";
  projectId: string;
  projectTitle: string;
  section: string;
  sectionLabel: string;
  sceneId: string | null;
  sceneTitle: string | null;
  characterId: string | null;
  characterName: string | null;
  scenes: StudioV23SceneContext[];
  balance: number | null;
};

let current: StudioFilmAssistantContext | null = null;
const listeners = new Set<() => void>();

export function publishStudioFilmAssistantContext(value: StudioFilmAssistantContext | null): void {
  current = value;
  for (const listener of listeners) listener();
}

export function readStudioFilmAssistantContext(): StudioFilmAssistantContext | null {
  return current;
}

export function subscribeStudioFilmAssistantContext(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
