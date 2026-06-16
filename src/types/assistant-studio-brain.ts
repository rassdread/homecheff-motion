import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type {
  AssistantContextSnapshot,
  AssistantLibraryContext,
  AssistantProjectContext,
} from "@/lib/assistant-context-layer";
import type { AssistantHistoryItem } from "@/types/assistant-history";
import type { AssistantProjectMemory } from "@/types/assistant-project-memory";

export type AssistantStudioRouteContext = {
  pathname: string;
  module: "home" | "studio" | "editor" | "motion" | "publish" | "library" | "projects" | "usage" | "other";
};

export type AssistantPreparedAssetRef = {
  assetId: string;
  assetName: string;
  kind: "character" | "location" | "outfit" | "prop" | "video" | "fusion" | "other";
  source: "library" | "execution" | "prefill";
};

export type AssistantUnfinishedFlow = {
  id: string;
  label: string;
  route?: string;
  actionId?: AssistantActionId;
  reason: "pending_prefill" | "pending_questions" | "draft_project";
};

export type AssistantUsageSummary = {
  creditsUsedEstimate?: number;
  renderCountEstimate?: number;
  assetGenerationCountEstimate?: number;
};

export type AssistantStudioContext = {
  route: AssistantStudioRouteContext;
  project: AssistantProjectContext | null;
  storyboardId: string | null;
  characters: AssistantLibraryContext["characters"];
  assets: AssistantLibraryContext["assets"];
  preparedAssets: AssistantPreparedAssetRef[];
  recentAssistantActions: AssistantHistoryItem[];
  unfinishedFlows: AssistantUnfinishedFlow[];
  usageSummary: AssistantUsageSummary;
  projectMemory: AssistantProjectMemory | null;
};

export type AssistantStudioBrainInput = {
  pathname: string;
  snapshot: AssistantContextSnapshot;
  activeProjectId?: string | null;
  pendingPrefillId?: string | null;
  recentHistory?: AssistantHistoryItem[];
  projectMemory?: AssistantProjectMemory | null;
  usageSummary?: AssistantUsageSummary;
};
