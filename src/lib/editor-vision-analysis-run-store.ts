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

export function editorVisionAnalysisPendingScopeKey(
  meta: Pick<EditorVisionAnalysisRunMeta, "projectId" | "assetId">
): string {
  return `${meta.projectId}::${meta.assetId}::pending`;
}

function notifyScopeListeners(scopeKey: string): void {
  const listeners = listenersByScopeKey.get(scopeKey);
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
}

/** Publish run meta — mirrors to `::pending` alias so UI hooks stay in sync before scope stamp. */
export function setRunMeta(scopeKey: string, meta: EditorVisionAnalysisRunMeta): void {
  metaByScopeKey.set(scopeKey, meta);
  notifyScopeListeners(scopeKey);

  const pendingKey = editorVisionAnalysisPendingScopeKey(meta);
  if (pendingKey !== scopeKey) {
    metaByScopeKey.set(pendingKey, meta);
    notifyScopeListeners(pendingKey);
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
  const direct = getRunMeta(input.scopeKey);
  if (direct) {
    return direct;
  }
  if (!input.scopeKey.endsWith("::pending")) {
    const [projectId, assetId] = input.scopeKey.split("::");
    if (projectId && assetId) {
      const pending = getRunMeta(`${projectId}::${assetId}::pending`);
      if (pending) {
        return pending;
      }
    }
  }
  return input.documentRunMeta ?? input.pendingRunMeta ?? null;
}

export function resetVisionRunMetaStoreForTests(): void {
  metaByScopeKey.clear();
  listenersByScopeKey.clear();
}
