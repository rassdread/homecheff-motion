"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearAssistantPrefillPackage,
  loadAssistantPrefillPackage,
  readAssistantPrefillIdFromSearch,
} from "@/lib/assistant-prefill-storage";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

export function useAssistantWizardPrefill() {
  const searchParams = useSearchParams();
  const prefillId = readAssistantPrefillIdFromSearch(searchParams);

  const prefill = useMemo(
    () => (prefillId ? loadAssistantPrefillPackage(prefillId) : null),
    [prefillId]
  );

  const clearPrefill = useCallback(() => {
    if (prefillId) {
      clearAssistantPrefillPackage(prefillId);
    }
  }, [prefillId]);

  return {
    prefillId,
    prefill,
    hasPrefill: Boolean(prefill),
    clearPrefill,
  };
}

export type AssistantWizardPrefillResult = {
  prefillId: string | null;
  prefill: AssistantPrefillPackage | null;
  hasPrefill: boolean;
  clearPrefill: () => void;
};
