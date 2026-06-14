/**
 * Dev-only editor analysis timing — admin debug panel.
 */

export type EditorAnalysisTimingRow = {
  stage: string;
  durationMs: number;
  at: string;
  note?: string;
};

const timingsBySession = new Map<string, EditorAnalysisTimingRow[]>();
const stageStarts = new Map<string, number>();

function sessionKey(sessionId: string): string {
  return sessionId.trim() || "anonymous";
}

export function resetEditorAnalysisTimings(sessionId: string): void {
  timingsBySession.delete(sessionKey(sessionId));
  for (const key of stageStarts.keys()) {
    if (key.startsWith(`${sessionKey(sessionId)}::`)) {
      stageStarts.delete(key);
    }
  }
}

export function beginEditorAnalysisStage(sessionId: string, stage: string): void {
  stageStarts.set(`${sessionKey(sessionId)}::${stage}`, Date.now());
}

export function endEditorAnalysisStage(
  sessionId: string,
  stage: string,
  note?: string
): number {
  const key = `${sessionKey(sessionId)}::${stage}`;
  const started = stageStarts.get(key);
  if (started == null) {
    return 0;
  }
  const durationMs = Math.max(0, Date.now() - started);
  stageStarts.delete(key);
  recordEditorAnalysisTiming(sessionId, stage, durationMs, note);
  return durationMs;
}

export function recordEditorAnalysisTiming(
  sessionId: string,
  stage: string,
  durationMs: number,
  note?: string
): void {
  const sid = sessionKey(sessionId);
  const rows = timingsBySession.get(sid) ?? [];
  rows.push({
    stage,
    durationMs: Math.round(durationMs),
    at: new Date().toISOString(),
    note,
  });
  timingsBySession.set(sid, rows);
}

export async function timeEditorAnalysisStage<T>(
  sessionId: string,
  stage: string,
  fn: () => Promise<T>,
  note?: string
): Promise<T> {
  beginEditorAnalysisStage(sessionId, stage);
  try {
    return await fn();
  } finally {
    endEditorAnalysisStage(sessionId, stage, note);
  }
}

export function listEditorAnalysisTimings(sessionId: string): EditorAnalysisTimingRow[] {
  return [...(timingsBySession.get(sessionKey(sessionId)) ?? [])];
}

/** Test helper */
export function resetEditorAnalysisTimingsForTests(): void {
  timingsBySession.clear();
  stageStarts.clear();
}
