export type InstantWizardMode = "beginner" | "expert";

const STORAGE_KEY = "hc-instant-wizard-mode";

export function readInstantWizardMode(): InstantWizardMode {
  if (typeof window === "undefined") {
    return "beginner";
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "expert" ? "expert" : "beginner";
}

export function writeInstantWizardMode(mode: InstantWizardMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, mode);
}
