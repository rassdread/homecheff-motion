"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveEditorProject } from "@/lib/editor-project-client";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorProjectSaveStatus = "idle" | "saving" | "saved" | "dirty" | "error";

const AUTOSAVE_MS = 800;

export function useEditorProjectPersist(params: {
  document: EditorCanvasDocument;
  enabled: boolean;
  onServerUpdatedAt?: (iso: string) => void;
}) {
  const [saveStatus, setSaveStatus] = useState<EditorProjectSaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedJsonRef = useRef<string | null>(null);
  const projectId = params.document.sessionId;

  const persistNow = useCallback(async (): Promise<boolean> => {
    if (!params.enabled) {
      return false;
    }
    const json = JSON.stringify(params.document);
    if (json === lastSavedJsonRef.current) {
      setSaveStatus("saved");
      return true;
    }
    if (savingRef.current) {
      return false;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    const result = await saveEditorProject(projectId, params.document, params.document.name);
    savingRef.current = false;
    if (!result.ok) {
      setSaveStatus("error");
      return false;
    }
    lastSavedJsonRef.current = json;
    if (result.updatedAt) {
      params.onServerUpdatedAt?.(result.updatedAt);
    }
    setSaveStatus("saved");
    return true;
  }, [params, projectId]);

  const scheduleAutosave = useCallback(() => {
    if (!params.enabled) {
      return;
    }
    const json = JSON.stringify(params.document);
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
  }, [params.document, params.enabled, persistNow]);

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [scheduleAutosave]);

  return { saveStatus, persistNow };
}
