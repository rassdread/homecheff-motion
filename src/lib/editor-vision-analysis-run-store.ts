/**
 * Reactive external store for vision analysis run meta — single source of truth
 * shared across hook instances and pipeline stage updates.
 *
 * Client hook: `useVisionRunMeta` from `@/hooks/use-vision-run-meta`.
 */

import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";

const metaByScopeKey = new Map<string, EditorVisionAnalysisRunMeta>();
const listenersByScopeKey = new Map<string, Set<() => void>>();

export function getRunMeta(scopeKey: string): EditorVisionAnalysisRunMeta | null {
  return metaByScopeKey.get(scopeKey) ?? null;
}

export function setRunMeta(scopeKey: string, meta: EditorVisionAnalysisRunMeta): void {
  metaByScopeKey.set(scopeKey, meta);
  const listeners = listenersByScopeKey.get(scopeKey);
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeRunMeta(scopeKey: string, callback: () => void): () => void {
  let listeners = listenersByScopeKey.get(scopeKey);
  if (!listeners) {
    listeners = new Set();
    listenersByScopeKey.set(scopeKey, listeners);
  }
  listeners.add(callback);
  return () => {
    listeners!.delete(callback);
  };
}

/** Stable snapshot read for useSyncExternalStore subscribers. */
export function getSnapshot(scopeKey: string): EditorVisionAnalysisRunMeta | null {
  return metaByScopeKey.get(scopeKey) ?? null;
}

export function resolveVisionRunMetaForDisplay(input: {
  scopeKey: string;
  documentRunMeta?: EditorVisionAnalysisRunMeta | null;
  pendingRunMeta?: EditorVisionAnalysisRunMeta | null;
}): EditorVisionAnalysisRunMeta | null {
  return (
    getRunMeta(input.scopeKey) ??
    input.documentRunMeta ??
    input.pendingRunMeta ??
    null
  );
}

export function resetVisionRunMetaStoreForTests(): void {
  metaByScopeKey.clear();
  listenersByScopeKey.clear();
}
