/**
 * Persist Studio V9 audio change plan + project audio assets (localStorage + server blob sync).
 */

import { scheduleStudioWorkspaceStateSync } from "@/lib/studio-workspace-state-client";
import {
  emptyStudioAudioChangePlan,
  emptyStudioAudioProjectAssetsRegistry,
} from "@/lib/studio-audio-change-plan";
import type {
  StudioAudioChangePlan,
  StudioAudioProjectAssetsRegistry,
} from "@/types/studio-audio-change-plan";

const CHANGE_PLAN_KEY_PREFIX = "hc-studio-audio-change-plan-";
const AUDIO_ASSETS_KEY_PREFIX = "hc-studio-audio-project-assets-";

type StudioAudioWorkspaceSnapshot = {
  changePlan: StudioAudioChangePlan | null;
  audioProjectAssets: StudioAudioProjectAssetsRegistry | null;
};

let snapshot: StudioAudioWorkspaceSnapshot = {
  changePlan: null,
  audioProjectAssets: null,
};
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeStudioAudioWorkspaceStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStudioAudioWorkspaceStoreSnapshot(): StudioAudioWorkspaceSnapshot {
  return snapshot;
}

function changePlanKey(storyboardId: string): string {
  return `${CHANGE_PLAN_KEY_PREFIX}${storyboardId}`;
}

function audioAssetsKey(storyboardId: string): string {
  return `${AUDIO_ASSETS_KEY_PREFIX}${storyboardId}`;
}

function parseChangePlan(raw: unknown, storyboardId: string): StudioAudioChangePlan | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as StudioAudioChangePlan;
  if (row.version !== 1 || !Array.isArray(row.items)) {
    return null;
  }
  return {
    version: 1,
    storyboardId,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
    items: row.items,
  };
}

function parseAudioAssets(
  raw: unknown,
  storyboardId: string
): StudioAudioProjectAssetsRegistry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as StudioAudioProjectAssetsRegistry;
  if (row.version !== 1 || !Array.isArray(row.assets)) {
    return null;
  }
  return {
    version: 1,
    storyboardId,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
    assets: row.assets,
  };
}

export function loadStudioAudioChangePlan(storyboardId: string): StudioAudioChangePlan {
  if (typeof window === "undefined" || !storyboardId.trim()) {
    return emptyStudioAudioChangePlan(storyboardId);
  }
  try {
    const raw = window.localStorage.getItem(changePlanKey(storyboardId));
    if (!raw) {
      return emptyStudioAudioChangePlan(storyboardId);
    }
    return parseChangePlan(JSON.parse(raw), storyboardId) ?? emptyStudioAudioChangePlan(storyboardId);
  } catch {
    return emptyStudioAudioChangePlan(storyboardId);
  }
}

export function loadStudioAudioProjectAssets(
  storyboardId: string
): StudioAudioProjectAssetsRegistry {
  if (typeof window === "undefined" || !storyboardId.trim()) {
    return emptyStudioAudioProjectAssetsRegistry(storyboardId);
  }
  try {
    const raw = window.localStorage.getItem(audioAssetsKey(storyboardId));
    if (!raw) {
      return emptyStudioAudioProjectAssetsRegistry(storyboardId);
    }
    return (
      parseAudioAssets(JSON.parse(raw), storyboardId) ??
      emptyStudioAudioProjectAssetsRegistry(storyboardId)
    );
  } catch {
    return emptyStudioAudioProjectAssetsRegistry(storyboardId);
  }
}

export function hydrateStudioAudioWorkspaceFromServer(input: {
  storyboardId: string;
  audioChangePlan?: StudioAudioChangePlan;
  audioProjectAssets?: StudioAudioProjectAssetsRegistry;
}): void {
  if (typeof window === "undefined") {
    return;
  }
  if (input.audioChangePlan) {
    window.localStorage.setItem(
      changePlanKey(input.storyboardId),
      JSON.stringify(input.audioChangePlan)
    );
  }
  if (input.audioProjectAssets) {
    window.localStorage.setItem(
      audioAssetsKey(input.storyboardId),
      JSON.stringify(input.audioProjectAssets)
    );
  }
  snapshot = {
    changePlan: input.audioChangePlan ?? loadStudioAudioChangePlan(input.storyboardId),
    audioProjectAssets:
      input.audioProjectAssets ?? loadStudioAudioProjectAssets(input.storyboardId),
  };
  emitChange();
}

export function saveStudioAudioChangePlan(
  plan: StudioAudioChangePlan,
  options?: { skipServerSync?: boolean }
): void {
  if (typeof window === "undefined" || !plan.storyboardId.trim()) {
    return;
  }
  try {
    window.localStorage.setItem(changePlanKey(plan.storyboardId), JSON.stringify(plan));
    snapshot = { ...snapshot, changePlan: plan };
    emitChange();
    if (!options?.skipServerSync) {
      scheduleStudioWorkspaceStateSync(plan.storyboardId, { audioChangePlan: plan });
    }
  } catch {
    /* quota */
  }
}

export function saveStudioAudioProjectAssets(
  registry: StudioAudioProjectAssetsRegistry,
  options?: { skipServerSync?: boolean }
): void {
  if (typeof window === "undefined" || !registry.storyboardId.trim()) {
    return;
  }
  try {
    window.localStorage.setItem(audioAssetsKey(registry.storyboardId), JSON.stringify(registry));
    snapshot = { ...snapshot, audioProjectAssets: registry };
    emitChange();
    if (!options?.skipServerSync) {
      scheduleStudioWorkspaceStateSync(registry.storyboardId, {
        audioProjectAssets: registry,
      });
    }
  } catch {
    /* quota */
  }
}
