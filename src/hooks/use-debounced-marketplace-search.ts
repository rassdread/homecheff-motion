"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMarketplaceSearchDebouncer,
  isMarketplaceSearchPending,
  MARKETPLACE_SEARCH_DEBOUNCE_MS,
} from "@/lib/studio-voice-marketplace-search";

export function useDebouncedMarketplaceSearch(initial = "") {
  const [searchInput, setSearchInputState] = useState(initial);
  const [debouncedSearch, setDebouncedSearch] = useState(initial);
  const debouncerRef = useRef(
    createMarketplaceSearchDebouncer(MARKETPLACE_SEARCH_DEBOUNCE_MS)
  );

  const applyDebounced = useCallback((value: string) => {
    setDebouncedSearch(value);
  }, []);

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
    debouncerRef.current.schedule(value, applyDebounced);
  }, [applyDebounced]);

  const flushSearch = useCallback(() => {
    debouncerRef.current.flush(searchInput, applyDebounced);
  }, [searchInput, applyDebounced]);

  const clearSearch = useCallback(() => {
    setSearchInputState("");
    debouncerRef.current.cancel();
    setDebouncedSearch("");
  }, []);

  useEffect(() => {
    const debouncer = debouncerRef.current;
    return () => {
      debouncer.cancel();
    };
  }, []);

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
    flushSearch,
    clearSearch,
    isSearchPending: isMarketplaceSearchPending(searchInput, debouncedSearch),
  };
}
