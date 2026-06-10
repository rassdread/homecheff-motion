export type ReplicateLabLastRun = {
  runtimeMs: number;
  completedAt: string;
  predictionId: string;
  prompt: string;
};

let lastRun: ReplicateLabLastRun | null = null;

export function recordReplicateLabRun(run: ReplicateLabLastRun): void {
  lastRun = run;
}

export function getReplicateLabLastRun(): ReplicateLabLastRun | null {
  return lastRun;
}
