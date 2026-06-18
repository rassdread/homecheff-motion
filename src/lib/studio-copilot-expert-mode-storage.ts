export const STUDIO_COPILOT_EXPERT_MODE_KEY = "homecheff:studio-copilot-expert-mode";

let memoryExpertMode: boolean | null = null;

export function readStudioCopilotExpertMode(): boolean {
  if (typeof window === "undefined") {
    return memoryExpertMode ?? false;
  }
  try {
    return window.localStorage.getItem(STUDIO_COPILOT_EXPERT_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeStudioCopilotExpertMode(enabled: boolean): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STUDIO_COPILOT_EXPERT_MODE_KEY, enabled ? "true" : "false");
      window.dispatchEvent(new CustomEvent("hc-studio-copilot-expert-mode-updated"));
      return;
    } catch {
      // fall through to memory store
    }
  }
  memoryExpertMode = enabled;
  for (const listener of expertModeListeners) {
    listener();
  }
}

const expertModeListeners = new Set<() => void>();

export function subscribeStudioCopilotExpertMode(onStoreChange: () => void): () => void {
  expertModeListeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("hc-studio-copilot-expert-mode-updated", onStoreChange);
  }
  return () => {
    expertModeListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("hc-studio-copilot-expert-mode-updated", onStoreChange);
    }
  };
}
