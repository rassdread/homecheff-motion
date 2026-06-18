"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { usePricingCatalog } from "@/hooks/use-pricing-catalog";
import { readIdentityPreservationOverrides } from "@/lib/studio-copilot-identity-preservation-storage";
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
import type { AssistantRecommendation } from "@/types/assistant-recommendation";
import { buildAssistantRecommendations } from "@/lib/assistant-recommendation-engine";
import { buildDynamicLibraryRecommendations } from "@/lib/assistant-dynamic-recommendations";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import { listAssistantHistory } from "@/lib/assistant-history";
import { trackAssistantAnalyticsEvent } from "@/lib/assistant-analytics";
import {
  appendAssistantProjectMemoryTurn,
  createEmptyAssistantProjectMemory,
  patchAssistantProjectMemory,
  readAssistantProjectMemory,
} from "@/lib/assistant-project-memory";
import { loadHomeCheffProject, persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { rememberAssistantRecommendation } from "@/lib/assistant-session-memory";
import { getAssistantAction } from "@/lib/assistant-action-registry";
import { markPrefillPackageOpened } from "@/lib/assistant-prefill-engine";
import { isAssistantAiInterpretationEnabled } from "@/lib/assistant-interpretation-flag";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import { recordAssistantHistoryItem, updateAssistantHistoryStatus } from "@/lib/assistant-history";
import type { AssistantBillingContext } from "@/types/studio-billing";
import { isMotionActionPresetId } from "@/lib/motion-action-presets";
import {
  buildAssistantPrefillRoute,
  storeAssistantEditorFusionBootstrap,
  storeAssistantPrefillPackage,
} from "@/lib/assistant-prefill-storage";
import { readAssistantEditorContext } from "@/lib/assistant-editor-context-bridge";
import {
  patchStudioCopilotLayout,
  readStudioCopilotLayout,
  subscribeStudioCopilotLayout,
} from "@/lib/studio-copilot-layout-storage";
import type {
  StudioCopilotLayoutPreferences,
  StudioCopilotPlacement,
} from "@/types/studio-copilot-layout";
import { DEFAULT_STUDIO_COPILOT_LAYOUT } from "@/types/studio-copilot-layout";

type HomeCheffAssistantContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: AssistantChatMessage[];
  suggestions: AssistantRecommendation[];
  memory: AssistantSessionMemory;
  snapshot: AssistantContextSnapshot;
  loadingContext: boolean;
  interpreting: boolean;
  sendMessage: (message: string) => void;
  acceptProposal: (proposal: AssistantProposal) => void;
  executeV4Preview: (preview: import("@/types/assistant-v4").AssistantExecutionPreview) => void;
  cancelPrefill: () => void;
  activeProjectId: string | null;
  libraryRecords: import("@/types/library-consistency").LibraryConsistencyRecord[];
  updateProposalPrefill: (prefillId: string, pkg: import("@/types/assistant-prefill").AssistantPrefillPackage) => void;
  startRecommendation: (recommendation: AssistantRecommendation) => void;
  copilotLayout: StudioCopilotLayoutPreferences;
  setCopilotPlacement: (placement: StudioCopilotPlacement) => void;
  setCopilotWidth: (width: number) => void;
  setCollapsedRecent: (collapsed: boolean) => void;
  setCopilotCompactMode: (compact: boolean) => void;
  copilotLayoutHydrated: boolean;
};

const HomeCheffAssistantContext = createContext<HomeCheffAssistantContextValue | null>(null);

export function useHomeCheffAssistant(): HomeCheffAssistantContextValue {
  const value = useContext(HomeCheffAssistantContext);
  if (!value) {
    throw new Error("useHomeCheffAssistant must be used within HomeCheffAssistantProvider");
  }
  return value;
}

/** Returns null when assistant provider is not mounted on this route. */
export function useOptionalHomeCheffAssistant(): HomeCheffAssistantContextValue | null {
  return useContext(HomeCheffAssistantContext);
}

export function HomeCheffAssistantProvider({ children }: { children: ReactNode }) {
  return <HomeCheffAssistantProviderCore>{children}</HomeCheffAssistantProviderCore>;
}

function HomeCheffAssistantProviderCore({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const [urlProjectId, setUrlProjectId] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      setUrlProjectId(params.get("hcProject")?.trim() || null);
    });
  }, [pathname]);

  /** Mobile bottom sheet only — desktop Growth Sidebar is always visible via layout. */
  const [open, setOpen] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [interpreting, setInterpreting] = useState(false);
  const [libraryRecords, setLibraryRecords] = useState<import("@/types/library-consistency").LibraryConsistencyRecord[]>([]);
  const initial = useMemo(() => createInitialAssistantSession(urlProjectId), [urlProjectId]);
  const [memory, setMemory] = useState<AssistantSessionMemory>(initial.memory);
  const [snapshot, setSnapshot] = useState<AssistantContextSnapshot>(initial.snapshot);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const storedCopilotLayout = useSyncExternalStore(
    subscribeStudioCopilotLayout,
    readStudioCopilotLayout,
    () => DEFAULT_STUDIO_COPILOT_LAYOUT
  );
  const copilotLayoutHydrated = useMounted();
  const effectiveCopilotLayout = copilotLayoutHydrated
    ? storedCopilotLayout
    : DEFAULT_STUDIO_COPILOT_LAYOUT;
  const interpretInFlightRef = useRef<string | null>(null);
  const [billingContext, setBillingContext] = useState<AssistantBillingContext | undefined>();
  const { items: pricingCatalog } = usePricingCatalog();

  useEffect(() => {
    if (!isAuthenticated) {
      queueMicrotask(() => setBillingContext(undefined));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/me/studio-account", { credentials: "include" });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as {
          wallet?: { availableBalance?: number };
          account?: { studioPlan?: string };
        };
        if (cancelled) {
          return;
        }
        setBillingContext({
          walletAvailableCredits: data.wallet?.availableBalance ?? 0,
          studioPlan: data.account?.studioPlan ?? "free",
        });
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const setCopilotPlacement = useCallback((placement: StudioCopilotPlacement) => {
    patchStudioCopilotLayout({ placement });
  }, []);

  const setCopilotWidth = useCallback((width: number) => {
    patchStudioCopilotLayout({ width });
  }, []);

  const setCollapsedRecent = useCallback((collapsedRecent: boolean) => {
    patchStudioCopilotLayout({ collapsedRecent });
  }, []);

  const setCopilotCompactMode = useCallback((compactMode: boolean) => {
    patchStudioCopilotLayout({ compactMode });
  }, []);

  const activeProjectId = memory.selectedProjectId ?? urlProjectId;
  const activeProject = useMemo(
    () => snapshot.projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, snapshot.projects]
  );

  const projectMemory = useMemo(() => {
    if (!activeProjectId) {
      return null;
    }
    const project = loadHomeCheffProject(activeProjectId);
    if (!project) {
      return null;
    }
    return readAssistantProjectMemory(project) ?? createEmptyAssistantProjectMemory();
  }, [activeProjectId]);

  const suggestions = useMemo(() => {
    const base = buildAssistantRecommendations({
      pathname,
      snapshot,
      activeProject,
      recentRecommendationIds: memory.recentRecommendationIds,
      sessionSeed: memory.recommendationSessionSeed ?? pathname,
    });
    const studio = buildAssistantStudioContext({
      pathname,
      snapshot,
      activeProjectId: activeProjectId ?? null,
      pendingPrefillId: memory.pendingPrefillId,
      recentHistory: listAssistantHistory(activeProjectId ?? null),
      projectMemory,
    });
    const dynamic = buildDynamicLibraryRecommendations(studio, pathname);
    const merged = [...dynamic, ...base.recommendations];
    const seen = new Set<string>();
    return merged
      .filter((row) => {
        if (seen.has(row.id)) {
          return false;
        }
        seen.add(row.id);
        return true;
      })
      .slice(0, 8);
  }, [
    pathname,
    snapshot,
    activeProject,
    activeProjectId,
    memory.recentRecommendationIds,
    memory.recommendationSessionSeed,
    memory.pendingPrefillId,
    projectMemory,
  ]);

  const refreshSnapshot = useCallback((records: typeof libraryRecords) => {
    setSnapshot(buildAssistantSnapshotFromClient({ libraryRecords: records }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session.resolved) {
      return;
    }
    if (!isAuthenticated) {
      queueMicrotask(() => {
        if (!cancelled) {
          setLibraryRecords([]);
          refreshSnapshot([]);
          setLoadingContext(false);
        }
      });
      return;
    }
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
  }, [pathname, refreshSnapshot, session.resolved, isAuthenticated]);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      if (!session.resolved) {
        return;
      }

      if (!isAuthenticated) {
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: "user",
            messageKey: "assistant.chat.userEcho",
            params: { text: trimmed },
          },
          {
            id: `assistant-login-${Date.now()}`,
            role: "assistant",
            messageKey: "assistant.growth.public.chatLoginRequired",
          },
        ]);
        return;
      }

      const runTurn = (interpretation: AssistantInterpretation | null | undefined) => {
        const result = processAssistantTurn({
          message: trimmed,
          memory,
          snapshot,
          urlProjectId,
          interpretation,
          isAuthenticated,
          locale: "nl",
          pathname,
          projectMemory,
          billingContext,
          pricingCatalog,
          editorContext: readAssistantEditorContext(),
          libraryRecords,
          identityPreservationOverrides: readIdentityPreservationOverrides(),
        });
        trackAssistantAnalyticsEvent("prompt", {
          prompt: trimmed,
          intent: result.memory.lastIntent ?? undefined,
          route: pathname,
        });
        const projectId = urlProjectId ?? result.memory.selectedProjectId;
        if (projectId) {
          const hcProject = loadHomeCheffProject(projectId);
          if (hcProject) {
            const existing = readAssistantProjectMemory(hcProject) ?? createEmptyAssistantProjectMemory();
            const producer = result.messages.find((row) => row.producerResponse)?.producerResponse;
            const updated = appendAssistantProjectMemoryTurn(existing, {
              userMessage: trimmed,
              intent: producer?.clusterId ?? result.memory.lastIntent ?? "unknown",
              route: producer?.suggestedRoute,
              characterName: result.memory.conversationMemory?.lastCharacter,
            });
            persistHomeCheffProject(patchAssistantProjectMemory(hcProject, updated));
          }
        }
        for (const message of result.messages) {
          if (message.proposal?.prefillPackage) {
            storeAssistantPrefillPackage(message.proposal.prefillPackage);
          }
        }
        setMemory(result.memory);
        setMessages((prev) => [...prev, ...result.messages]);
        const proposal = result.messages.find((row) => row.proposal)?.proposal;
        const pkg = proposal?.prefillPackage;
        const presetCandidate =
          pkg?.interpretation?.likelyPresetId ?? pkg?.hcActionPreset?.actionPresetId;
        recordAssistantHistoryItem({
          id: pkg?.id,
          userMessage: trimmed,
          assistantSummary:
            pkg?.interpretationSummary?.creativeGoal ??
            pkg?.interpretationSummary?.understoodGoal ??
            trimmed.slice(0, 120),
          intent: pkg?.interpretation?.detectedIntent ?? result.memory.lastIntent ?? "unknown",
          presetId:
            presetCandidate && isMotionActionPresetId(presetCandidate)
              ? presetCandidate
              : undefined,
          actionId: proposal?.actionId,
          status: proposal ? "planned" : "completed",
          projectId: urlProjectId ?? result.memory.selectedProjectId,
          route: pkg?.targetRoute ?? proposal?.route,
          relatedAssetIds: [],
          relatedLibraryRecordIds: [],
        });
        setInterpreting(false);
      };

      if (isAssistantAiInterpretationEnabled()) {
        const interpretCredits =
          pricingCatalog.find((row) => row.actionType === "assistant_interpret")?.creditCost ?? 1;
        const walletCredits = billingContext?.walletAvailableCredits ?? 0;
        const canCallLlmInterpret = walletCredits >= interpretCredits;

        if (!canCallLlmInterpret) {
          runTurn(null);
          return;
        }

        if (interpretInFlightRef.current === trimmed) {
          return;
        }
        interpretInFlightRef.current = trimmed;
        setInterpreting(true);
        void (async () => {
          try {
            const res = await fetch("/api/assistant/interpret", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: trimmed, locale: "nl" }),
            });
            if (res.ok) {
              const data = (await res.json()) as { interpretation?: AssistantInterpretation | null };
              runTurn(data.interpretation ?? null);
              return;
            }
            // 403 credit gate / permission — fall back to local rules, no retry
          } catch {
            /* fallback to rules inside orchestrator */
          } finally {
            if (interpretInFlightRef.current === trimmed) {
              interpretInFlightRef.current = null;
            }
          }
          runTurn(null);
        })();
        return;
      }

      runTurn(null);
    },
    [memory, snapshot, urlProjectId, isAuthenticated, pathname, projectMemory, billingContext, pricingCatalog, session.resolved]
  );

  const acceptProposal = useCallback((proposal: AssistantProposal) => {
    if (!isAuthenticated) {
      return;
    }
    if (proposal.prefillPackage) {
      if (proposal.prefillPackage.readiness !== "ready_to_open") {
        return;
      }
      const opened = markPrefillPackageOpened(proposal.prefillPackage);
      storeAssistantPrefillPackage(opened);
      if (opened.fusion) {
        storeAssistantEditorFusionBootstrap(opened);
      }
      updateAssistantHistoryStatus(opened.id, "opened", {
        route: buildAssistantPrefillRoute(opened.targetRoute, opened.id),
        assistantSummary:
          opened.interpretationSummary?.creativeGoal ??
          opened.interpretationSummary?.understoodGoal ??
          opened.generationGoal ??
          "Assistant flow",
      });
      trackAssistantAnalyticsEvent("wizard_opened", {
        route: buildAssistantPrefillRoute(opened.targetRoute, opened.id),
        intent: opened.interpretation?.detectedIntent,
      });
      setMemory((prev) => ({
        ...rememberAssistantWizard(prev, proposal.actionId),
        pendingPrefillId: opened.id,
      }));
      window.location.assign(buildAssistantPrefillRoute(opened.targetRoute, opened.id));
      return;
    }
    setMemory((prev) => rememberAssistantWizard(prev, proposal.actionId));
    window.location.assign(proposal.route);
  }, [isAuthenticated]);

  const executeV4Preview = useCallback(
    (preview: import("@/types/assistant-v4").AssistantExecutionPreview) => {
      if (!isAuthenticated || preview.status === "blocked") {
        return;
      }
      trackAssistantAnalyticsEvent("wizard_opened", {
        route: preview.route,
        intent: preview.toolId,
      });
      window.location.assign(preview.route);
    },
    [isAuthenticated]
  );

  const cancelPrefill = useCallback(() => {
    setMemory((prev) => ({ ...prev, pendingPrefillId: null, activeWizard: null }));
  }, []);

  const updateProposalPrefill = useCallback(
    (prefillId: string, pkg: import("@/types/assistant-prefill").AssistantPrefillPackage) => {
      storeAssistantPrefillPackage(pkg);
      setMessages((prev) =>
        prev.map((message) => {
          if (message.proposal?.prefillPackage?.id !== prefillId) {
            return message;
          }
          return {
            ...message,
            proposal: {
              ...message.proposal,
              prefillPackage: pkg,
              understoodKey: pkg.understoodKey,
            },
          };
        })
      );
    },
    []
  );

  const startRecommendation = useCallback(
    (recommendation: AssistantRecommendation) => {
      trackAssistantAnalyticsEvent("recommendation_accepted", {
        recommendationId: recommendation.id,
        route: pathname,
      });
      setMemory((prev) => rememberAssistantRecommendation(prev, recommendation.id));
      sendMessage(recommendation.promptMessage);
    },
    [sendMessage, pathname]
  );

  const value = useMemo(
    () => ({
      open,
      setOpen,
      messages,
      suggestions,
      memory,
      snapshot,
      loadingContext,
      interpreting,
      sendMessage,
      acceptProposal,
      executeV4Preview,
      cancelPrefill,
      activeProjectId: memory.selectedProjectId ?? urlProjectId,
      libraryRecords,
      updateProposalPrefill,
      startRecommendation,
      copilotLayout: effectiveCopilotLayout,
      copilotLayoutHydrated,
      setCopilotPlacement,
      setCopilotWidth,
      setCollapsedRecent,
      setCopilotCompactMode,
    }),
    [
      open,
      messages,
      suggestions,
      memory,
      snapshot,
      loadingContext,
      interpreting,
      sendMessage,
      acceptProposal,
      executeV4Preview,
      cancelPrefill,
      urlProjectId,
      libraryRecords,
      updateProposalPrefill,
      startRecommendation,
      effectiveCopilotLayout,
      copilotLayoutHydrated,
      setCopilotPlacement,
      setCopilotWidth,
      setCollapsedRecent,
      setCopilotCompactMode,
    ]
  );

  return (
    <HomeCheffAssistantContext.Provider value={value}>{children}</HomeCheffAssistantContext.Provider>
  );
}

export function formatAssistantActionLabel(actionId: string): string {
  return getAssistantAction(actionId as never).id;
}
