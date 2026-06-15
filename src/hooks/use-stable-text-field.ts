"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  recordPublishWizardAutosaveTriggered,
  recordPublishWizardScrollDelta,
  recordPublishWizardTypingStarted,
} from "@/lib/publish-wizard-typing-diagnostics";

export const PUBLISH_WIZARD_AUTOSAVE_DEBOUNCE_MS = 1750;

type Options = {
  value: string;
  onCommit: (value: string) => void;
  debounceMs?: number;
  trackDiagnostics?: boolean;
};

export function useStableTextField({
  value,
  onCommit,
  debounceMs = PUBLISH_WIZARD_AUTOSAVE_DEBOUNCE_MS,
  trackDiagnostics = true,
}: Options) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);
  const scrollYOnFocusRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(value);
  const selectionRef = useRef({ start: 0, end: 0 });
  const elementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusedRef.current) return;
    if (value === lastCommittedRef.current) return;
    setDraft(value);
    lastCommittedRef.current = value;
  }, [value]);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const commit = useCallback(
    (next: string) => {
      if (next === lastCommittedRef.current) return;
      if (trackDiagnostics) {
        recordPublishWizardAutosaveTriggered();
      }
      lastCommittedRef.current = next;
      onCommit(next);
    },
    [onCommit, trackDiagnostics]
  );

  const scheduleCommit = useCallback(
    (next: string) => {
      clearDebounce();
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        commit(next);
      }, debounceMs);
    },
    [clearDebounce, commit, debounceMs]
  );

  const restoreSelection = useCallback(() => {
    const el = elementRef.current;
    if (!el || document.activeElement !== el) return;
    const { start, end } = selectionRef.current;
    try {
      el.setSelectionRange(start, end);
    } catch {
      // Some input types do not support selection ranges.
    }
  }, []);

  const onChange = useCallback(
    (next: string, element?: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (element) {
        elementRef.current = element;
      }
      setDraft(next);
      selectionRef.current = {
        start: element?.selectionStart ?? next.length,
        end: element?.selectionEnd ?? next.length,
      };
      scheduleCommit(next);
      queueMicrotask(restoreSelection);
    },
    [restoreSelection, scheduleCommit]
  );

  const onFocus = useCallback((element?: HTMLTextAreaElement | HTMLInputElement | null) => {
    if (element) {
      elementRef.current = element;
    }
    focusedRef.current = true;
    scrollYOnFocusRef.current = window.scrollY;
    if (trackDiagnostics) {
      recordPublishWizardTypingStarted();
    }
  }, [trackDiagnostics]);

  const onBlur = useCallback(() => {
    focusedRef.current = false;
    clearDebounce();
    commit(draft);
    if (scrollYOnFocusRef.current !== null) {
      const delta = window.scrollY - scrollYOnFocusRef.current;
      if (trackDiagnostics) {
        recordPublishWizardScrollDelta(delta);
      }
      scrollYOnFocusRef.current = null;
    }
  }, [clearDebounce, commit, draft, trackDiagnostics]);

  useEffect(() => () => clearDebounce(), [clearDebounce]);

  return {
    draft,
    onChange,
    onFocus,
    onBlur,
    flush: () => {
      clearDebounce();
      commit(draft);
    },
  };
}
