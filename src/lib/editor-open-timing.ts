/**
 * Editor image-open performance markers — dev/admin audit for open vs analysis timing.
 */

export type EditorOpenTimingKey =
  | "imageSelectedAt"
  | "localDocumentSavedAt"
  | "routeStartedAt"
  | "editorMountedAt"
  | "imageVisibleAt"
  | "analysisStartedAt"
  | "provisionalReadyAt"
  | "finalReadyAt";

export type EditorOpenStage =
  | "photo_loading"
  | "editor_opening"
  | "analysis_preparing"
  | "provisional_detection"
  | "deep_analysis"
  | "ready";

export type EditorOpenTimingAudit = {
  stage: EditorOpenStage;
  timings: Partial<Record<EditorOpenTimingKey, number>>;
  timingIso: Partial<Record<EditorOpenTimingKey, string>>;
  at: string;
};

const OPEN_STAGE_LABEL_KEYS: Record<EditorOpenStage, string> = {
  photo_loading: "editor.open.stage.photoLoading",
  editor_opening: "editor.open.stage.editorOpening",
  analysis_preparing: "editor.open.stage.analysisPreparing",
  provisional_detection: "editor.open.stage.provisionalDetection",
  deep_analysis: "editor.open.stage.deepAnalysis",
  ready: "editor.open.stage.ready",
};

let currentStage: EditorOpenStage = "photo_loading";
const timingMs: Partial<Record<EditorOpenTimingKey, number>> = {};
let activeTimingSession: string | null = null;

export function resetEditorOpenTimingForTests(): void {
  currentStage = "photo_loading";
  activeTimingSession = null;
  for (const key of Object.keys(timingMs) as EditorOpenTimingKey[]) {
    delete timingMs[key];
  }
}

export function beginEditorOpenTimingSession(sessionId: string): void {
  if (activeTimingSession === sessionId) {
    return;
  }
  activeTimingSession = sessionId;
  currentStage = "photo_loading";
  for (const key of Object.keys(timingMs) as EditorOpenTimingKey[]) {
    delete timingMs[key];
  }
}

export function markEditorOpenTiming(key: EditorOpenTimingKey, at = Date.now()): void {
  if (timingMs[key] != null) {
    return;
  }
  timingMs[key] = at;
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    console.debug("[editor.open.timing]", key, new Date(at).toISOString());
  }
}

export function recordEditorOpenStage(stage: EditorOpenStage): void {
  currentStage = stage;
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    console.debug("[editor.open.stage]", stage);
  }
}

export function getEditorOpenStage(): EditorOpenStage {
  return currentStage;
}

export function editorOpenStageLabelKey(stage: EditorOpenStage = currentStage): string {
  return OPEN_STAGE_LABEL_KEYS[stage];
}

export function getEditorOpenTimingAudit(): EditorOpenTimingAudit {
  const timingIso: Partial<Record<EditorOpenTimingKey, string>> = {};
  for (const [key, value] of Object.entries(timingMs) as Array<[EditorOpenTimingKey, number]>) {
    timingIso[key] = new Date(value).toISOString();
  }
  return {
    stage: currentStage,
    timings: { ...timingMs },
    timingIso,
    at: new Date().toISOString(),
  };
}

export function msSinceEditorOpenTiming(
  from: EditorOpenTimingKey,
  to: EditorOpenTimingKey
): number | null {
  const start = timingMs[from];
  const end = timingMs[to];
  if (start == null || end == null) {
    return null;
  }
  return end - start;
}
