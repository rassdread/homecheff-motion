/**
 * Session-scoped diagnostics for wizard cache / image URL issues.
 * Avoids noisy repeated console warnings when IndexedDB is unavailable.
 */

const warnedKeys = new Set<string>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Full logging when `localStorage.hc-instant-cache-debug=1` or URL has `debugCache=1`. */
export function isInstantCacheDebugEnabled(): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    if (window.localStorage.getItem("hc-instant-cache-debug") === "1") {
      return true;
    }
    return new URLSearchParams(window.location.search).get("debugCache") === "1";
  } catch {
    return false;
  }
}

function shouldLog(warnKey: string): boolean {
  if (isInstantCacheDebugEnabled()) {
    return true;
  }
  if (warnedKeys.has(warnKey)) {
    return false;
  }
  warnedKeys.add(warnKey);
  return true;
}

export function warnIndexedDbCacheFailed(
  op: string,
  details: Record<string, unknown> = {}
): void {
  const warnKey = `indexeddb:${op}`;
  if (!shouldLog(warnKey)) {
    return;
  }
  console.warn("[indexeddb-cache-failed]", {
    op,
    ...details,
    ...(isInstantCacheDebugEnabled() ? {} : { note: "logged once per session; set hc-instant-cache-debug=1 for verbose logs" }),
  });
}

export function warnWizardStorageFailed(
  op: string,
  details: Record<string, unknown> = {}
): void {
  const warnKey = `wizard-storage:${op}`;
  if (!shouldLog(warnKey)) {
    return;
  }
  console.warn("[wizard-storage-failed]", { op, ...details });
}

export function warnInvalidImageUrl(
  context: string,
  details: Record<string, unknown> = {}
): void {
  const warnKey = `image-url:${context}`;
  if (!shouldLog(warnKey)) {
    return;
  }
  console.warn("[image-url-invalid]", { context, ...details });
}

/** Test helper — reset session warn dedupe. */
export function resetInstantCacheDiagnosticsForTests(): void {
  warnedKeys.clear();
}
