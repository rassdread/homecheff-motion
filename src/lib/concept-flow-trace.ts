import { patchConceptFlowDebug } from "@/lib/concept-flow-debug-state";

/** Console + debug snapshot for Nieuwe versie → edit-version → draft bootstrap. */
export function traceConceptFlow(
  phase: string,
  detail?: Record<string, unknown>
): void {
  const payload = detail ? ` ${JSON.stringify(detail)}` : "";
  console.info(`[concept-flow] ${phase}${payload}`);
  const err =
    detail?.error && typeof detail.error === "string"
      ? detail.error
      : detail?.lastError && typeof detail.lastError === "string"
        ? detail.lastError
        : null;
  patchConceptFlowDebug({
    lastStep: phase,
    ...(err ? { lastError: err } : {}),
  });
}
