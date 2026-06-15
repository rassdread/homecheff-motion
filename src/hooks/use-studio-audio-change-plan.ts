"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  loadStudioAudioChangePlan,
  loadStudioAudioProjectAssets,
  saveStudioAudioChangePlan,
  saveStudioAudioProjectAssets,
  subscribeStudioAudioWorkspaceStore,
  getStudioAudioWorkspaceStoreSnapshot,
} from "@/lib/studio-audio-change-plan-storage";
import { addStudioAudioChangePlanItem } from "@/lib/studio-audio-change-plan";
import type {
  StudioAudioChangePlan,
  StudioAudioProjectAssetsRegistry,
} from "@/types/studio-audio-change-plan";

export function useStudioAudioChangePlan(storyboardId: string) {
  const snapshot = useSyncExternalStore(
    subscribeStudioAudioWorkspaceStore,
    getStudioAudioWorkspaceStoreSnapshot,
    getStudioAudioWorkspaceStoreSnapshot
  );

  const changePlan =
    snapshot.changePlan?.storyboardId === storyboardId
      ? snapshot.changePlan
      : loadStudioAudioChangePlan(storyboardId);

  const audioProjectAssets =
    snapshot.audioProjectAssets?.storyboardId === storyboardId
      ? snapshot.audioProjectAssets
      : loadStudioAudioProjectAssets(storyboardId);

  const setChangePlan = useCallback(
    (next: StudioAudioChangePlan) => {
      saveStudioAudioChangePlan(next);
    },
    []
  );

  const setAudioProjectAssets = useCallback(
    (next: StudioAudioProjectAssetsRegistry) => {
      saveStudioAudioProjectAssets(next);
    },
    []
  );

  const enqueueChange = useCallback(
    (
      partial: Parameters<typeof addStudioAudioChangePlanItem>[1]
    ) => {
      const current = loadStudioAudioChangePlan(storyboardId);
      const next = addStudioAudioChangePlanItem(current, partial);
      saveStudioAudioChangePlan(next);
      return next;
    },
    [storyboardId]
  );

  return {
    changePlan,
    audioProjectAssets,
    setChangePlan,
    setAudioProjectAssets,
    enqueueChange,
  };
}
