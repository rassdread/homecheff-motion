"use client";

import { useSyncExternalStore } from "react";

/** True only after client hydration — use for locale/time text that must match server "—". */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
