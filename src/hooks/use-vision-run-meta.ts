"use client";

import { useSyncExternalStore } from "react";
import { getSnapshot, subscribeRunMeta } from "@/lib/editor-vision-analysis-run-store";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";

/** Subscribe to reactive vision run meta for a scope key. */
export function useVisionRunMeta(scopeKey: string): EditorVisionAnalysisRunMeta | null {
  return useSyncExternalStore(
    (onStoreChange) => subscribeRunMeta(scopeKey, onStoreChange),
    () => getSnapshot(scopeKey),
    () => null
  );
}
