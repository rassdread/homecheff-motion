/**
 * Persist asset decisions in localStorage (same-browser reload; no schema migration).
 */

import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";

const DRAFT_KEY = "hc-studio-asset-decisions-draft";
const STORYBOARD_KEY_PREFIX = "hc-studio-asset-decisions-";
export const IDENTITY_PREFILL_KEY = "hc-studio-identity-builder-prefill";

export function emptyAssetDecisionRegistry(params?: {
  storyboardId?: string;
  briefIdea?: string;
}): StudioAssetDecisionRegistry {
  return {
    version: 1,
    storyboardId: params?.storyboardId,
    briefIdea: params?.briefIdea,
    updatedAt: new Date(0).toISOString(),
    decisions: [],
  };
}

export function assetDecisionStorageKey(storyboardId: string): string {
  return `${STORYBOARD_KEY_PREFIX}${storyboardId}`;
}

export function loadAssetDecisionRegistry(params: {
  storyboardId?: string;
  briefIdea?: string;
}): StudioAssetDecisionRegistry {
  if (typeof window === "undefined") {
    return emptyAssetDecisionRegistry(params);
  }
  const key =
    params.storyboardId ?
      assetDecisionStorageKey(params.storyboardId)
    : DRAFT_KEY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return emptyAssetDecisionRegistry(params);
    }
    const parsed = JSON.parse(raw) as StudioAssetDecisionRegistry;
    if (parsed.version !== 1 || !Array.isArray(parsed.decisions)) {
      return emptyAssetDecisionRegistry(params);
    }
    return {
      version: 1,
      storyboardId: params.storyboardId ?? parsed.storyboardId,
      briefIdea: params.briefIdea ?? parsed.briefIdea,
      updatedAt: parsed.updatedAt,
      decisions: parsed.decisions,
    };
  } catch {
    return emptyAssetDecisionRegistry(params);
  }
}

export function saveAssetDecisionRegistry(registry: StudioAssetDecisionRegistry): void {
  if (typeof window === "undefined") {
    return;
  }
  const key =
    registry.storyboardId ?
      assetDecisionStorageKey(registry.storyboardId)
    : DRAFT_KEY;
  try {
    window.localStorage.setItem(key, JSON.stringify(registry));
  } catch {
    /* quota or private mode */
  }
}

export function migrateDraftDecisionsToStoryboard(storyboardId: string, briefIdea?: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const draft = loadAssetDecisionRegistry({ briefIdea });
  if (draft.decisions.length === 0) {
    return;
  }
  const migrated: StudioAssetDecisionRegistry = {
    ...draft,
    storyboardId,
    briefIdea: briefIdea ?? draft.briefIdea,
    updatedAt: new Date().toISOString(),
  };
  saveAssetDecisionRegistry(migrated);
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
