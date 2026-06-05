export type StudioDirectorV2Mode = "beginner" | "expert";

const STORAGE_KEY = "hc-studio-director-v2-mode";

export function readStudioDirectorV2Mode(): StudioDirectorV2Mode {
  if (typeof window === "undefined") {
    return "beginner";
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "expert" ? "expert" : "beginner";
}

export function writeStudioDirectorV2Mode(mode: StudioDirectorV2Mode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, mode);
}
