export type ConceptFlowDebugSnapshot = {
  lastStep: string;
  lastError: string | null;
  projectId: string;
  projectLoaded: boolean;
  imagesCount: number;
  sessionResolved: boolean;
  sessionUser: boolean;
  editorMounted: boolean;
  bootstrapStarted: boolean;
  bootstrapFinished: boolean;
  draftFetchPending: boolean;
  loadState: string;
  slotsCount: number;
  projectFetchPending: boolean;
  updatedAt: number;
};

const initial: ConceptFlowDebugSnapshot = {
  lastStep: "init",
  lastError: null,
  projectId: "",
  projectLoaded: false,
  imagesCount: 0,
  sessionResolved: false,
  sessionUser: false,
  editorMounted: false,
  bootstrapStarted: false,
  bootstrapFinished: false,
  draftFetchPending: false,
  loadState: "idle",
  slotsCount: 0,
  projectFetchPending: false,
  updatedAt: Date.now(),
};

let snapshot: ConceptFlowDebugSnapshot = { ...initial };
const listeners = new Set<() => void>();

export function getConceptFlowDebugSnapshot(): ConceptFlowDebugSnapshot {
  return snapshot;
}

export function resetConceptFlowDebug(projectId: string): void {
  snapshot = { ...initial, projectId, lastStep: "reset", updatedAt: Date.now() };
  listeners.forEach((l) => l());
}

export function patchConceptFlowDebug(patch: Partial<ConceptFlowDebugSnapshot>): void {
  snapshot = {
    ...snapshot,
    ...patch,
    updatedAt: Date.now(),
  };
  listeners.forEach((l) => l());
}

export function subscribeConceptFlowDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
