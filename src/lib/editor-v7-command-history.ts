import type {
  EditorCanvasDocument,
  EditorV7AssistantState,
  EditorV7CommandHistoryEntry,
  EditorV7CommandPlan,
} from "@/types/homecheff-visual-editor";

function historyId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultAssistantState(): EditorV7AssistantState {
  return {
    history: [],
    historyCursor: -1,
    sidebarCollapsed: true,
    previewMode: false,
  };
}

export function ensureAssistantState(document: EditorCanvasDocument): EditorV7AssistantState {
  return document.assistantState ?? defaultAssistantState();
}

export function attachActivePlan(
  document: EditorCanvasDocument,
  plan: EditorV7CommandPlan,
  preview = true
): EditorCanvasDocument {
  const state = ensureAssistantState(document);
  return {
    ...document,
    assistantState: {
      ...state,
      activePlan: plan,
      previewMode: preview,
    },
  };
}

export function clearActivePlan(document: EditorCanvasDocument): EditorCanvasDocument {
  const state = ensureAssistantState(document);
  return {
    ...document,
    assistantState: {
      ...state,
      activePlan: undefined,
      previewMode: false,
    },
  };
}

export function recordAppliedCommand(
  document: EditorCanvasDocument,
  plan: EditorV7CommandPlan
): EditorCanvasDocument {
  const state = ensureAssistantState(document);
  const entry: EditorV7CommandHistoryEntry = {
    id: historyId(),
    prompt: plan.prompt,
    planId: plan.id,
    appliedAt: new Date().toISOString(),
    status: "applied",
  };
  const trimmed = state.history.slice(0, state.historyCursor + 1);
  return {
    ...document,
    assistantState: {
      ...state,
      history: [...trimmed, entry],
      historyCursor: trimmed.length,
      activePlan: undefined,
      previewMode: false,
    },
  };
}

export function undoCommandHistory(document: EditorCanvasDocument): EditorCanvasDocument {
  const state = ensureAssistantState(document);
  if (state.historyCursor < 0) {
    return document;
  }
  const entry = state.history[state.historyCursor];
  const updated = state.history.map((h, i) =>
    i === state.historyCursor ? { ...h, status: "undone" as const } : h
  );
  return {
    ...document,
    assistantState: {
      ...state,
      history: updated,
      historyCursor: state.historyCursor - 1,
      activePlan: undefined,
    },
  };
}

export function redoCommandHistory(document: EditorCanvasDocument): EditorCanvasDocument {
  const state = ensureAssistantState(document);
  const nextIndex = state.historyCursor + 1;
  if (nextIndex >= state.history.length) {
    return document;
  }
  const updated = state.history.map((h, i) =>
    i === nextIndex ? { ...h, status: "applied" as const } : h
  );
  return {
    ...document,
    assistantState: {
      ...state,
      history: updated,
      historyCursor: nextIndex,
    },
  };
}

export function duplicateHistoryEntry(
  document: EditorCanvasDocument,
  entryId: string
): EditorV7CommandHistoryEntry | null {
  const state = ensureAssistantState(document);
  const entry = state.history.find((h) => h.id === entryId);
  if (!entry) {
    return null;
  }
  return {
    ...entry,
    id: historyId(),
    appliedAt: new Date().toISOString(),
    status: "applied",
  };
}

export function rerunHistoryPrompt(document: EditorCanvasDocument, entryId: string): string | null {
  const state = ensureAssistantState(document);
  const entry = state.history.find((h) => h.id === entryId);
  return entry?.prompt ?? null;
}

export function toggleAssistantSidebar(document: EditorCanvasDocument): EditorCanvasDocument {
  const state = ensureAssistantState(document);
  return {
    ...document,
    assistantState: {
      ...state,
      sidebarCollapsed: !state.sidebarCollapsed,
    },
  };
}

export function canUndoCommandHistory(document: EditorCanvasDocument): boolean {
  const state = ensureAssistantState(document);
  return state.historyCursor >= 0;
}

export function canRedoCommandHistory(document: EditorCanvasDocument): boolean {
  const state = ensureAssistantState(document);
  return state.historyCursor < state.history.length - 1;
}
