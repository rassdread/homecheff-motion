"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import {
  draftPayloadToEditorSlots,
  serializeFullRerenderDraftPayload,
  type PersistedFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import { planFullRerenderDraftBootstrap } from "@/lib/full-rerender-draft-bootstrap";
import {
  deleteFullRerenderDraftClient,
  ensureFullRerenderDraft,
  fetchFullRerenderDraft,
  saveFullRerenderDraft,
} from "@/lib/full-rerender-draft-client";
import type { FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";

export type FullRerenderDraftSaveStatus = "idle" | "saving" | "saved" | "dirty" | "error";

export type FullRerenderDraftLoadState =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "storage_unavailable"
  | "skipped";

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
  const [loadState, setLoadState] = useState<FullRerenderDraftLoadState>("idle");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedJsonRef = useRef<string | null>(null);
  const bootstrapAttemptRef = useRef(0);

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
    if (!params.enabled || !params.ready || !draftLoaded) {
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
      if (result.storageUnavailable) {
        setLoadState("storage_unavailable");
      }
      return false;
    }
    lastSavedJsonRef.current = json;
    setServerUpdatedAt(result.updatedAt);
    setSaveStatus("saved");
    return true;
  }, [buildPayload, draftLoaded, params.enabled, params.projectId, params.ready]);

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
    loadState: FullRerenderDraftLoadState;
  } | null> => {
    const attempt = ++bootstrapAttemptRef.current;
    setLoadState("loading");
    setLoadError(null);

    const get = await fetchFullRerenderDraft(params.projectId);
    if (attempt !== bootstrapAttemptRef.current) {
      return null;
    }

    let plan = planFullRerenderDraftBootstrap(get);
    if (plan.kind === "needs_create") {
      const post = await ensureFullRerenderDraft(params.projectId);
      if (attempt !== bootstrapAttemptRef.current) {
        return null;
      }
      plan = planFullRerenderDraftBootstrap(get, post);
    }

    if (plan.kind === "storage_unavailable") {
      setLoadState("storage_unavailable");
      setLoadError(null);
      setDraftLoaded(false);
      return { loadState: "storage_unavailable", payload: null, slots: null, expandedIndex: null, versionNote: "", userIntent: "", transitionSeconds: params.transitionSeconds };
    }

    if (plan.kind === "ready") {
      lastSavedJsonRef.current = JSON.stringify(plan.draft);
      setServerUpdatedAt(plan.updatedAt);
      setDraftLoaded(true);
      setLoadState("ready");
      setSaveStatus("saved");
      return {
        loadState: "ready",
        payload: plan.draft,
        slots: draftPayloadToEditorSlots(plan.draft),
        expandedIndex: plan.draft.expandedIndex,
        versionNote: plan.draft.versionNote,
        userIntent: plan.draft.userIntent,
        transitionSeconds: plan.draft.transitionSeconds,
      };
    }

    if (plan.kind === "fallback") {
      setLoadState("error");
      setLoadError(plan.error ?? "Draft load failed.");
      setDraftLoaded(false);
      return {
        loadState: "error",
        payload: null,
        slots: null,
        expandedIndex: null,
        versionNote: "",
        userIntent: "",
        transitionSeconds: params.transitionSeconds,
      };
    }

    setLoadState("error");
    setLoadError("Draft load failed.");
    setDraftLoaded(false);
    return null;
  }, [params.projectId, params.transitionSeconds]);

  const skipDraftPersistence = useCallback(() => {
    bootstrapAttemptRef.current += 1;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    lastSavedJsonRef.current = null;
    setDraftLoaded(false);
    setLoadError(null);
    setLoadState("skipped");
    setSaveStatus("idle");
  }, []);

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
    loadState,
    draftLoaded,
    serverUpdatedAt,
    bootstrapDraft,
    skipDraftPersistence,
    persistNow,
    deleteDraft,
    setSaveStatus,
  };
}
