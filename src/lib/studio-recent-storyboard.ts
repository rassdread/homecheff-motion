const STORAGE_KEY = "hc-studio-recent-storyboard-id";

export function readRecentStoryboardId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(STORAGE_KEY)?.trim();
  return value || null;
}

export function rememberRecentStoryboardId(storyboardId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = storyboardId.trim();
  if (!trimmed) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearRecentStoryboardId(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
