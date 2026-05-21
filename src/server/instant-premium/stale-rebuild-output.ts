export const STALE_REBUILD_OUTPUT = "STALE_REBUILD_OUTPUT";

export class StaleRebuildOutputError extends Error {
  readonly code = STALE_REBUILD_OUTPUT;

  constructor(message: string) {
    super(message);
    this.name = "StaleRebuildOutputError";
  }
}
