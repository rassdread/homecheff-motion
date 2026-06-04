"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import {
  draftPayloadToEditorSlots,
  serializeFullRerenderDraftPayload,
  type PersistedFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import {
  deleteFullRerenderDraftClient,
  ensureFullRerenderDraft,
  saveFullRerenderDraft,
} from "@/lib/full-rerender-draft-client";
import type { FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";

export type FullRerenderDraftSaveStatus = "idle" | "saving" | "saved" | "dirty" | "error";

const AUTOSAVE_MS = 800;

export function useFullRerenderDraft(params: {
  projectId: string;
  enabled: boolean;
  slots: FullRerenderEditorSlot[];
  versionNote: string;
  userIntent: string;
  transitionSeconds: number;
  instantMode: InstantMode;
  expandedIndex: number | null;
  initialImageIds: string[];
  ready: boolean;
}) {
  const [saveStatus, setSaveStatus] = useState<FullRerenderDraftSaveStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedJsonRef = useRef<string | null>(null);

  const buildPayload = useCallback((): PersistedFullRerenderDraftPayload => {
    return serializeFullRerenderDraftPayload({
      slots: params.slots,
      versionNote: params.versionNote,
      userIntent: params.userIntent,
      transitionSeconds: params.transitionSeconds,
      instantMode: params.instantMode,
      expandedIndex: params.expandedIndex,
      initialImageIds: params.initialImageIds,
    });
  }, [
    params.slots,
    params.versionNote,
    params.userIntent,
    params.transitionSeconds,
    params.instantMode,
    params.expandedIndex,
    params.initialImageIds,
  ]);

  const persistNow = useCallback(async (): Promise<boolean> => {
    if (!params.enabled || !params.ready) {
      return false;
    }
    const payload = buildPayload();
    const json = JSON.stringify(payload);
    if (json === lastSavedJsonRef.current) {
      setSaveStatus("saved");
      return true;
    }
    if (savingRef.current) {
      return false;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    const result = await saveFullRerenderDraft(params.projectId, payload);
    savingRef.current = false;
    if (!result.ok) {
      setSaveStatus("error");
      return false;
    }
    lastSavedJsonRef.current = json;
    setServerUpdatedAt(result.updatedAt);
    setSaveStatus("saved");
    return true;
  }, [buildPayload, params.enabled, params.projectId, params.ready]);

  const scheduleAutosave = useCallback(() => {
    if (!params.enabled || !params.ready || !draftLoaded) {
      return;
    }
    const json = JSON.stringify(buildPayload());
    if (json === lastSavedJsonRef.current) {
      return;
    }
    setSaveStatus("dirty");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void persistNow();
    }, AUTOSAVE_MS);
  }, [buildPayload, draftLoaded, params.enabled, params.ready, persistNow]);

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [scheduleAutosave]);

  const bootstrapDraft = useCallback(async (): Promise<{
    payload: PersistedFullRerenderDraftPayload | null;
    slots: FullRerenderEditorSlot[] | null;
    expandedIndex: number | null;
    versionNote: string;
    userIntent: string;
    transitionSeconds: number;
  } | null> => {
    setLoadError(null);
    const result = await ensureFullRerenderDraft(params.projectId);
    if (!result.ok || !result.draft) {
      setLoadError(result.error ?? "Draft load failed.");
      return null;
    }
    lastSavedJsonRef.current = JSON.stringify(result.draft);
    setServerUpdatedAt(result.updatedAt);
    setDraftLoaded(true);
    setSaveStatus("saved");
    return {
      payload: result.draft,
      slots: draftPayloadToEditorSlots(result.draft),
      expandedIndex: result.draft.expandedIndex,
      versionNote: result.draft.versionNote,
      userIntent: result.draft.userIntent,
      transitionSeconds: result.draft.transitionSeconds,
    };
  }, [params.projectId]);

  const deleteDraft = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    const result = await deleteFullRerenderDraftClient(params.projectId);
    if (!result.ok) {
      setSaveStatus("error");
      return false;
    }
    lastSavedJsonRef.current = null;
    setDraftLoaded(false);
    setSaveStatus("idle");
    return true;
  }, [params.projectId]);

  return {
    saveStatus,
    loadError,
    draftLoaded,
    serverUpdatedAt,
    bootstrapDraft,
    persistNow,
    deleteDraft,
    setSaveStatus,
  };
}
