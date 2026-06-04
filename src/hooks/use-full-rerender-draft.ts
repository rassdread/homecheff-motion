"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import {
  serializeFullRerenderDraftPayload,
  type PersistedFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import {
  ensureFullRerenderDraft,
  fetchFullRerenderDraft,
  saveFullRerenderDraft,
  deleteFullRerenderDraftClient,
} from "@/lib/full-rerender-draft-client";
import { runFullRerenderConceptBootstrap } from "@/lib/full-rerender-concept-bootstrap";
import type { FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";
import type { FullRerenderDraftBootstrapDiagnostics } from "@/lib/full-rerender-draft-diagnostics";

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
  buildLocalDraft: () => PersistedFullRerenderDraftPayload;
}) {
  const [saveStatus, setSaveStatus] = useState<FullRerenderDraftSaveStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<FullRerenderDraftLoadState>("idle");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [bootstrapDiagnostics, setBootstrapDiagnostics] =
    useState<FullRerenderDraftBootstrapDiagnostics | null>(null);
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
    slots: FullRerenderEditorSlot[];
    expandedIndex: number | null;
    versionNote: string;
    userIntent: string;
    transitionSeconds: number;
    loadState: FullRerenderDraftLoadState;
    draftPersisted: boolean;
    diagnostics: FullRerenderDraftBootstrapDiagnostics;
  } | null> => {
    const attempt = ++bootstrapAttemptRef.current;
    setLoadState("loading");
    setLoadError(null);

    const result = await runFullRerenderConceptBootstrap({
      projectId: params.projectId,
      buildLocalDraft: params.buildLocalDraft,
      fetchGet: fetchFullRerenderDraft,
      fetchPost: ensureFullRerenderDraft,
    });

    if (attempt !== bootstrapAttemptRef.current) {
      return null;
    }

    setBootstrapDiagnostics(result.diagnostics);

    if (result.status === "storage_unavailable") {
      setLoadState("storage_unavailable");
      setDraftLoaded(false);
      return {
        loadState: "storage_unavailable",
        payload: null,
        slots: [],
        expandedIndex: null,
        versionNote: "",
        userIntent: "",
        transitionSeconds: params.transitionSeconds,
        draftPersisted: false,
        diagnostics: result.diagnostics,
      };
    }

    if (result.status === "ready") {
      lastSavedJsonRef.current = JSON.stringify(result.draft);
      setServerUpdatedAt(null);
      setDraftLoaded(true);
      setLoadState("ready");
      setSaveStatus("saved");
      return {
        loadState: "ready",
        payload: result.draft,
        slots: result.slots,
        expandedIndex: result.expandedIndex,
        versionNote: result.versionNote,
        userIntent: result.userIntent,
        transitionSeconds: result.transitionSeconds,
        draftPersisted: result.draftPersisted,
        diagnostics: result.diagnostics,
      };
    }

    setLoadState("error");
    setLoadError(result.error);
    setDraftLoaded(false);
    return {
      loadState: "error",
      payload: null,
      slots: result.slots,
      expandedIndex: result.expandedIndex,
      versionNote: result.versionNote,
      userIntent: result.userIntent,
      transitionSeconds: result.transitionSeconds,
      draftPersisted: false,
      diagnostics: result.diagnostics,
    };
  }, [params.buildLocalDraft, params.projectId, params.transitionSeconds]);

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
    bootstrapDiagnostics,
    skipDraftPersistence,
    persistNow,
    deleteDraft,
    setSaveStatus,
  };
}
