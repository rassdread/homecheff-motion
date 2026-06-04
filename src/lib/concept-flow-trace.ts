/** Dev/admin console tracing for Nieuwe versie → edit-version → draft bootstrap. */
export function traceConceptFlow(
  phase: string,
  detail?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI !== "true") {
    return;
  }
  const payload = detail ? ` ${JSON.stringify(detail)}` : "";
  console.info(`[concept-flow] ${phase}${payload}`);
}
