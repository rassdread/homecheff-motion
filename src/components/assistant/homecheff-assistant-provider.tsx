"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildAssistantSnapshotFromClient,
  createInitialAssistantSession,
  processAssistantTurn,
  type AssistantChatMessage,
  type AssistantProposal,
} from "@/lib/assistant-orchestrator";
import type { AssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { queryLibraryConsistency } from "@/lib/library-consistency-client";
import type { AssistantSessionMemory } from "@/lib/assistant-session-memory";
import { rememberAssistantWizard } from "@/lib/assistant-session-memory";
import type { AssistantSuggestion } from "@/lib/assistant-suggestions";
import { getAssistantAction } from "@/lib/assistant-action-registry";

type HomeCheffAssistantContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: AssistantChatMessage[];
  suggestions: AssistantSuggestion[];
  memory: AssistantSessionMemory;
  snapshot: AssistantContextSnapshot;
  loadingContext: boolean;
  sendMessage: (message: string) => void;
  acceptProposal: (proposal: AssistantProposal) => void;
  activeProjectId: string | null;
};

const HomeCheffAssistantContext = createContext<HomeCheffAssistantContextValue | null>(null);

export function useHomeCheffAssistant(): HomeCheffAssistantContextValue {
  const value = useContext(HomeCheffAssistantContext);
  if (!value) {
    throw new Error("useHomeCheffAssistant must be used within HomeCheffAssistantProvider");
  }
  return value;
}

export function HomeCheffAssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("hcProject")?.trim() || null;

  const [open, setOpen] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [libraryRecords, setLibraryRecords] = useState<import("@/types/library-consistency").LibraryConsistencyRecord[]>([]);
  const initial = useMemo(() => createInitialAssistantSession(urlProjectId), [urlProjectId]);
  const [memory, setMemory] = useState<AssistantSessionMemory>(initial.memory);
  const [snapshot, setSnapshot] = useState<AssistantContextSnapshot>(initial.snapshot);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);

  const refreshSnapshot = useCallback((records: typeof libraryRecords) => {
    setSnapshot(buildAssistantSnapshotFromClient({ libraryRecords: records }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        setLoadingContext(true);
        const response = await queryLibraryConsistency({ limit: 500 });
        if (cancelled) {
          return;
        }
        const records = response.ok ? (response.results ?? []) : [];
        setLibraryRecords(records);
        refreshSnapshot(records);
        setLoadingContext(false);
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, refreshSnapshot]);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      const result = processAssistantTurn({
        message: trimmed,
        memory,
        snapshot,
        urlProjectId,
      });
      setMemory(result.memory);
      setMessages((prev) => [...prev, ...result.messages]);
      setSuggestions(result.suggestions);
    },
    [memory, snapshot, urlProjectId]
  );

  const acceptProposal = useCallback((proposal: AssistantProposal) => {
    setMemory((prev) => rememberAssistantWizard(prev, proposal.actionId));
    window.location.assign(proposal.route);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      messages,
      suggestions,
      memory,
      snapshot,
      loadingContext,
      sendMessage,
      acceptProposal,
      activeProjectId: memory.selectedProjectId ?? urlProjectId,
    }),
    [
      open,
      messages,
      suggestions,
      memory,
      snapshot,
      loadingContext,
      sendMessage,
      acceptProposal,
      urlProjectId,
    ]
  );

  return (
    <HomeCheffAssistantContext.Provider value={value}>{children}</HomeCheffAssistantContext.Provider>
  );
}

export function formatAssistantActionLabel(actionId: string): string {
  return getAssistantAction(actionId as never).id;
}
