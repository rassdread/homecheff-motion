import type { IdentityPreservationOverrides } from "@/types/assistant-identity-preservation";
import { DEFAULT_IDENTITY_PRESERVATION_OVERRIDES } from "@/lib/assistant-identity-preservation";

export const STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY = "homecheff:studio-copilot-identity-preservation";

let memoryOverrides: IdentityPreservationOverrides | null = null;

export function readIdentityPreservationOverrides(): IdentityPreservationOverrides {
  if (typeof window === "undefined") {
    return memoryOverrides ?? { ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES };
  }
  try {
    const raw = window.localStorage.getItem(STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY);
    if (!raw) {
      return { ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES };
    }
    const parsed = JSON.parse(raw) as Partial<IdentityPreservationOverrides>;
    return { ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES, ...parsed };
  } catch {
    return { ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES };
  }
}

export function writeIdentityPreservationOverrides(overrides: IdentityPreservationOverrides): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY, JSON.stringify(overrides));
      window.dispatchEvent(new CustomEvent("hc-studio-copilot-identity-preservation-updated"));
      return;
    } catch {
      // fall through
    }
  }
  memoryOverrides = overrides;
  for (const listener of listeners) {
    listener();
  }
}

const listeners = new Set<() => void>();

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
