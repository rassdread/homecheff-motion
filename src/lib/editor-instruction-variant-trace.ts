import { isPublicDebugUiEnabled } from "@/lib/debug-ui";
import type { EditorVariantTriggerSource } from "@/lib/editor-instruction-variant-preflight";

export type EditorVariantTraceRoute =
  | "/api/editor/instruction/variant"
  | "/api/editor/instruction/variant/bulk";

export type EditorVariantTraceEntry = {
  id: string;
  timestamp: string;
  triggerSource: EditorVariantTriggerSource | string;
  sessionId?: string;
  componentName: string;
  buttonName: string;
  route: EditorVariantTraceRoute;
  blocked: boolean;
  sent: boolean;
  responseStatus?: number | "blocked" | "client_blocked";
  validationCode?: string;
  stackTrace?: string;
};

const MAX_VARIANT_TRACE_ENTRIES = 20;
const traceEntries: EditorVariantTraceEntry[] = [];
const listeners = new Set<() => void>();

function nextTraceId(): string {
  return `vtrace_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function captureEditorVariantDevStackTrace(): string | undefined {
  if (process.env.NODE_ENV === "production" && !isPublicDebugUiEnabled()) {
    return undefined;
  }
  const stack = new Error("[editor.variant.trace]").stack;
  if (!stack) {
    return undefined;
  }
  return stack
    .split("\n")
    .slice(2, 10)
    .map((line) => line.trim())
    .join("\n");
}

export function recordEditorVariantTrace(
  entry: Omit<EditorVariantTraceEntry, "id" | "timestamp" | "stackTrace"> & {
    captureStack?: boolean;
  }
): EditorVariantTraceEntry {
  const row: EditorVariantTraceEntry = {
    id: nextTraceId(),
    timestamp: new Date().toISOString(),
    stackTrace: entry.captureStack === false ? undefined : captureEditorVariantDevStackTrace(),
    ...entry,
  };

  traceEntries.unshift(row);
  if (traceEntries.length > MAX_VARIANT_TRACE_ENTRIES) {
    traceEntries.length = MAX_VARIANT_TRACE_ENTRIES;
  }

  if (process.env.NODE_ENV !== "production" || isPublicDebugUiEnabled()) {
    console.info("[editor.variant.trace]", {
      timestamp: row.timestamp,
      triggerSource: row.triggerSource,
      sessionId: row.sessionId,
      componentName: row.componentName,
      buttonName: row.buttonName,
      route: row.route,
      blocked: row.blocked,
      sent: row.sent,
      responseStatus: row.responseStatus,
      validationCode: row.validationCode,
      stackTrace: row.stackTrace,
    });
  }

  for (const listener of listeners) {
    listener();
  }

  return row;
}

export function listEditorVariantTraces(): EditorVariantTraceEntry[] {
  return [...traceEntries];
}

export function subscribeEditorVariantTraces(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearEditorVariantTraces(): void {
  traceEntries.length = 0;
  for (const listener of listeners) {
    listener();
  }
}
