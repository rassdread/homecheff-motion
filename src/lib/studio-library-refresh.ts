export const STUDIO_LIBRARY_REFRESH_EVENT = "hc-studio-library-refresh";

export type StudioLibraryRefreshDetail = {
  assetId?: string;
  entityKind?: string;
};

export function notifyStudioLibraryRefresh(detail?: StudioLibraryRefreshDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(STUDIO_LIBRARY_REFRESH_EVENT, { detail }));
}

export function subscribeStudioLibraryRefresh(handler: (detail?: StudioLibraryRefreshDetail) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const listener = (event: Event) => {
    handler((event as CustomEvent<StudioLibraryRefreshDetail>).detail);
  };
  window.addEventListener(STUDIO_LIBRARY_REFRESH_EVENT, listener);
  return () => window.removeEventListener(STUDIO_LIBRARY_REFRESH_EVENT, listener);
}
