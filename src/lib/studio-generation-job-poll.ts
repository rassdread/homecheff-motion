/**
 * SHARED_PURE — Canonical generation-job poller (client-safe).
 * Stops on terminal status, exponential backoff, single interval, abortable.
 */

import { isStudioGenerationTerminal } from "@/lib/studio-generation-status";

export type StudioGenerationPollSnapshot = {
  jobId: string;
  status: string;
};

export type StudioGenerationJobPollerOptions = {
  jobId: string;
  fetchStatus: (jobId: string) => Promise<StudioGenerationPollSnapshot>;
  onUpdate?: (snapshot: StudioGenerationPollSnapshot) => void;
  /** Initial delay ms (default 1000) */
  initialDelayMs?: number;
  /** Max delay ms (default 8000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default 1.5) */
  backoff?: number;
  signal?: AbortSignal;
};

/**
 * Poll until terminal status or abort. Returns final snapshot.
 * Does not invent progress; does not start a second poller for the same call.
 */
export async function pollStudioGenerationJobUntilTerminal(
  options: StudioGenerationJobPollerOptions
): Promise<StudioGenerationPollSnapshot> {
  const initial = Math.max(250, options.initialDelayMs ?? 1000);
  const maxDelay = Math.max(initial, options.maxDelayMs ?? 8000);
  const backoff = options.backoff && options.backoff > 1 ? options.backoff : 1.5;
  let delay = initial;
  let last: StudioGenerationPollSnapshot = {
    jobId: options.jobId,
    status: "pending",
  };

  while (!options.signal?.aborted) {
    last = await options.fetchStatus(options.jobId);
    options.onUpdate?.(last);
    if (isStudioGenerationTerminal(last.status)) {
      return last;
    }
    await sleep(delay, options.signal);
    delay = Math.min(maxDelay, Math.round(delay * backoff));
  }

  return last;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
