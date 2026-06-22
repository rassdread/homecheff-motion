import type { IdentityPreservationOverrides } from "@/types/assistant-identity-preservation";
import { DEFAULT_IDENTITY_PRESERVATION_OVERRIDES } from "@/lib/assistant-identity-preservation";
import { shallowRecordEqual } from "@/lib/external-store-snapshot";

export const STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY = "homecheff:studio-copilot-identity-preservation";

const STABLE_DEFAULT_OVERRIDES: IdentityPreservationOverrides = Object.freeze({
  ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES,
});

let memoryOverrides: IdentityPreservationOverrides | null = null;

/** Stable snapshot for useSyncExternalStore — must not allocate new objects per read. */
let cachedOverridesRaw: string | null | undefined = undefined;
let cachedOverridesSnapshot: IdentityPreservationOverrides = STABLE_DEFAULT_OVERRIDES;

const listeners = new Set<() => void>();

function readOverridesRaw(): string | null {
  if (typeof window === "undefined") {
    return memoryOverrides ? JSON.stringify(memoryOverrides) : null;
  }
  try {
    return window.localStorage.getItem(STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY);
  } catch {
    return null;
  }
}

function parseOverridesFromRaw(raw: string | null): IdentityPreservationOverrides {
  if (!raw) {
    return STABLE_DEFAULT_OVERRIDES;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<IdentityPreservationOverrides>;
    const merged = { ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES, ...parsed };
    if (shallowRecordEqual(merged, STABLE_DEFAULT_OVERRIDES)) {
      return STABLE_DEFAULT_OVERRIDES;
    }
    return merged;
  } catch {
    return STABLE_DEFAULT_OVERRIDES;
  }
}

export function readIdentityPreservationOverrides(): IdentityPreservationOverrides {
  const raw = readOverridesRaw();
  if (raw === cachedOverridesRaw) {
    return cachedOverridesSnapshot;
  }
  cachedOverridesRaw = raw;
  const parsed = parseOverridesFromRaw(raw);
  if (shallowRecordEqual(parsed, cachedOverridesSnapshot)) {
    return cachedOverridesSnapshot;
  }
  cachedOverridesSnapshot = parsed;
  return cachedOverridesSnapshot;
}

export function writeIdentityPreservationOverrides(overrides: IdentityPreservationOverrides): void {
  if (shallowRecordEqual(overrides, cachedOverridesSnapshot)) {
    return;
  }

  const normalized =
    shallowRecordEqual(overrides, STABLE_DEFAULT_OVERRIDES) ? STABLE_DEFAULT_OVERRIDES : overrides;
  const serialized = JSON.stringify(normalized);

  cachedOverridesRaw = serialized;
  cachedOverridesSnapshot = normalized;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY, serialized);
      window.dispatchEvent(new CustomEvent("hc-studio-copilot-identity-preservation-updated"));
      return;
    } catch {
      // fall through
    }
  }
  memoryOverrides = { ...normalized };
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeIdentityPreservationOverrides(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("hc-studio-copilot-identity-preservation-updated", onStoreChange);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("hc-studio-copilot-identity-preservation-updated", onStoreChange);
    }
  };
}

/** Test helper — reset cached snapshot between tests. */
export function resetIdentityPreservationCacheForTests(): void {
  cachedOverridesRaw = undefined;
  cachedOverridesSnapshot = STABLE_DEFAULT_OVERRIDES;
  memoryOverrides = null;
}
