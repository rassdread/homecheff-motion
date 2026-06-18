import type { AssistantEditorContextHint } from "@/types/assistant-v3";

export const ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY = "hc-assistant-editor-context-v1";

export function publishAssistantEditorContext(hint: AssistantEditorContextHint): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY, JSON.stringify(hint));
  } catch {
    // ignore quota / private mode
  }
}

export function readAssistantEditorContext(): AssistantEditorContextHint | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AssistantEditorContextHint;
  } catch {
    return null;
  }
}

export function clearAssistantEditorContext(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
