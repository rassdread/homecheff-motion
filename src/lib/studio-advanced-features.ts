"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";

const STORAGE_KEY = "hc-studio-advanced-features";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readAdvancedEnabled(): boolean {
  if (!isStudioProductionModeEnabled()) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function useStudioAdvancedFeatures(): [boolean, (enabled: boolean) => void] {
  const advanced = useSyncExternalStore(subscribe, readAdvancedEnabled, () => false);

  const setAdvanced = useCallback((enabled: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    for (const listener of listeners) {
      listener();
    }
  }, []);

  return [advanced, setAdvanced];
}

export function useStudioProductionUiMode(): "simple" | "advanced" {
  const [advanced] = useStudioAdvancedFeatures();
  if (!isStudioProductionModeEnabled()) {
    return "advanced";
  }
  return advanced ? "advanced" : "simple";
}

export function shouldShowStudioAdvancedSurface(): boolean {
  return readAdvancedEnabled();
}
