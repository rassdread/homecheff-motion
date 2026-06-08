/**
 * Voice Marketplace search — debounce helpers and applied-filter shaping.
 */

import type { VoiceLibraryFilters } from "@/lib/studio-voice-accent-model";

export const MARKETPLACE_SEARCH_DEBOUNCE_MS = 400;
export const MARKETPLACE_SEARCH_MIN_LENGTH = 2;

/** Text search applies from 2 characters; shorter input keeps structural filters only. */
export function resolveMarketplaceSearchQuery(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim() ?? "";
  if (trimmed.length < MARKETPLACE_SEARCH_MIN_LENGTH) {
    return undefined;
  }
  return trimmed;
}

export function buildMarketplaceAppliedFilters(
  structuralFilters: VoiceLibraryFilters,
  debouncedSearch: string
): VoiceLibraryFilters {
  const query = resolveMarketplaceSearchQuery(debouncedSearch);
  if (!query) {
    const { query: _omit, ...rest } = structuralFilters;
    return rest;
  }
  return { ...structuralFilters, query };
}

export function isMarketplaceSearchPending(
  searchInput: string,
  debouncedSearch: string
): boolean {
  return searchInput.trim() !== debouncedSearch.trim();
}

export type MarketplaceSearchDebouncer = {
  schedule: (value: string, apply: (value: string) => void) => void;
  flush: (value: string, apply: (value: string) => void) => void;
  cancel: () => void;
};

/** Pure debouncer with generation guard — only the latest scheduled value may apply. */
export function createMarketplaceSearchDebouncer(
  delayMs: number = MARKETPLACE_SEARCH_DEBOUNCE_MS
): MarketplaceSearchDebouncer {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const invalidatePending = () => {
    generation += 1;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    schedule(value, apply) {
      const gen = ++generation;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        if (gen === generation) {
          apply(value);
        }
      }, delayMs);
    },
    flush(value, apply) {
      invalidatePending();
      apply(value);
    },
    cancel() {
      invalidatePending();
    },
  };
}
