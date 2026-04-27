/** Structured logs for export retry (browser + server). */
export function hcExportRetryLog(
  scope: "client" | "server",
  phase: string,
  data: Record<string, unknown>
): void {
  console.info("[hc-export-retry]", { scope, phase, ...data, t: new Date().toISOString() });
}
