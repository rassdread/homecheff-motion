/**
 * In-memory record of scene fields the manual editor has not saved yet.
 * The assistant waits for the save, then refuses to overwrite fields that failed.
 */

type DirtyKey = string;

type Inflight = {
  projectId: string;
  sceneId: string;
  done: Promise<void>;
  resolve: () => void;
};

const dirty = new Map<DirtyKey, Set<string>>();
const inflight = new Map<number, Inflight>();
let sequence = 0;

function key(projectId: string, sceneId: string): DirtyKey {
  return `${projectId}:${sceneId}`;
}

export function beginPendingSceneEdit(input: { projectId: string; sceneId: string; fields: string[] }): number {
  const id = ++sequence;
  const bucket = dirty.get(key(input.projectId, input.sceneId)) ?? new Set<string>();
  for (const field of input.fields) bucket.add(field);
  dirty.set(key(input.projectId, input.sceneId), bucket);
  let resolve: () => void = () => undefined;
  const done = new Promise<void>((doneResolve) => {
    resolve = doneResolve;
  });
  inflight.set(id, { projectId: input.projectId, sceneId: input.sceneId, done, resolve });
  return id;
}

export function finishPendingSceneEdit(id: number, saved: boolean) {
  const row = inflight.get(id);
  if (!row) return;
  row.resolve();
  inflight.delete(id);
  if (!saved) return;
  dirty.delete(key(row.projectId, row.sceneId));
}

export function pendingSceneFields(projectId: string, sceneId: string): string[] {
  return [...(dirty.get(key(projectId, sceneId)) ?? [])];
}

export async function flushPendingSceneEdits(projectId: string, sceneId: string): Promise<string[]> {
  const waits = [...inflight.values()]
    .filter((row) => row.projectId === projectId && row.sceneId === sceneId)
    .map((row) => row.done);
  await Promise.all(waits);
  return pendingSceneFields(projectId, sceneId);
}

export function clearPendingSceneEditsForTests() {
  dirty.clear();
  inflight.clear();
}
