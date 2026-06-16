import type {
  AssistantProjectContext,
  AssistantContextSnapshot,
} from "@/lib/assistant-context-layer";
import { ASSISTANT_RECOMMENDATION_CATALOG } from "@/lib/assistant-recommendation-catalog";
import {
  groupRecommendationsByCategory,
  rotateAssistantRecommendations,
} from "@/lib/assistant-recommendation-rotation";
import type {
  AssistantRecommendation,
  AssistantRecommendationCatalogEntry,
  AssistantRecommendationEngineInput,
  AssistantRecommendationEngineResult,
  AssistantRecommendationPage,
  AssistantRecommendationStatus,
} from "@/types/assistant-recommendation";

export function detectAssistantRecommendationPage(pathname: string): AssistantRecommendationPage {
  if (pathname === "/") {
    return "home";
  }
  if (pathname.startsWith("/editor")) {
    return "editor";
  }
  if (pathname.startsWith("/animate") || pathname.startsWith("/motion")) {
    return "motion";
  }
  if (pathname.startsWith("/library") || pathname.startsWith("/studio/assets")) {
    return "library";
  }
  if (pathname.startsWith("/studio")) {
    return "studio";
  }
  if (pathname.startsWith("/projects")) {
    return "projects";
  }
  if (pathname.startsWith("/publish")) {
    return "publish";
  }
  if (
    pathname.startsWith("/usage") ||
    pathname.startsWith("/mijn-verbruik") ||
    pathname.startsWith("/account/usage")
  ) {
    return "usage";
  }
  return "home";
}

function hasCharacter(snapshot: AssistantContextSnapshot): boolean {
  return snapshot.library.characters.length > 0;
}

function motionReadyCharacters(snapshot: AssistantContextSnapshot) {
  return snapshot.library.characters.filter((row) => row.motionReady === true);
}

function hasFamilyLikePhotos(snapshot: AssistantContextSnapshot): boolean {
  const hay = [
    ...snapshot.library.characters,
    ...snapshot.library.references,
    ...snapshot.library.fusionOutputs,
  ];
  return hay.some((asset) => {
    const blob = `${asset.assetName} ${asset.promptSummary ?? ""}`.toLowerCase();
    return (
      blob.includes("family") ||
      blob.includes("familie") ||
      blob.includes("couple") ||
      blob.includes("partner") ||
      blob.includes("child") ||
      blob.includes("kind")
    );
  });
}

function primaryCharacterName(snapshot: AssistantContextSnapshot, project?: AssistantProjectContext | null) {
  const projectCharacter = project
    ? snapshot.library.characters.find((row) => row.projectId === project.id)
    : null;
  const motionReady = motionReadyCharacters(snapshot)[0];
  return projectCharacter?.assetName ?? motionReady?.assetName ?? snapshot.library.characters[0]?.assetName;
}

function computeStatus(
  entry: AssistantRecommendationCatalogEntry,
  snapshot: AssistantContextSnapshot,
  project?: AssistantProjectContext | null
): { status: AssistantRecommendationStatus; statusNoteKey?: AssistantRecommendation["statusNoteKey"] } {
  const character = hasCharacter(snapshot);
  const motionReady = motionReadyCharacters(snapshot).length > 0;

  if (entry.id === "continue_project") {
    if (project || snapshot.projects.length > 0) {
      return { status: "ready", statusNoteKey: entry.statusReadyKey };
    }
    return { status: "start" };
  }

  if (entry.requiresFamilyPhotos && !hasFamilyLikePhotos(snapshot)) {
    return { status: "missing", statusNoteKey: "assistant.recommendation.status.familyPhotosMissing" };
  }

  if (entry.requiresCharacter && !character) {
    return { status: "missing", statusNoteKey: "assistant.recommendation.status.characterMissing" };
  }

  if (entry.requiresMotionReady && !motionReady) {
    return {
      status: "missing",
      statusNoteKey: "assistant.recommendation.status.motionReadyMissing",
    };
  }

  if (entry.actionPresetId && character) {
    if (motionReady) {
      return { status: "ready", statusNoteKey: entry.statusReadyKey ?? "assistant.recommendation.status.readyToStart" };
    }
    return {
      status: "missing",
      statusNoteKey: entry.statusMissingKey ?? "assistant.recommendation.status.onlyStadiumMissing",
    };
  }

  if (character && entry.requiresCharacter) {
    return { status: "ready", statusNoteKey: entry.statusReadyKey ?? "assistant.recommendation.status.readyToStart" };
  }

  return { status: "start" };
}

function scoreEntry(
  entry: AssistantRecommendationCatalogEntry,
  page: AssistantRecommendationPage,
  snapshot: AssistantContextSnapshot,
  project?: AssistantProjectContext | null,
  status?: AssistantRecommendationStatus
): number {
  let score = entry.trendingScore ?? 50;
  if (entry.pages.includes(page)) {
    score += 40;
  }
  if (page === "home" && entry.pages.includes("home")) {
    score += 20;
  }
  if (entry.category === "continue_working" && (project || snapshot.projects.length > 0)) {
    score += 35;
  }
  if (entry.category === "hidden_possibilities" && page === "editor") {
    score += 15;
  }
  if (entry.hiddenFeature) {
    score += 5;
  }
  if (status === "ready") {
    score += 25;
  }
  if (status === "missing") {
    score += 10;
  }
  if (!hasCharacter(snapshot) && entry.requiresCharacter) {
    score -= 5;
  }
  if (motionReadyCharacters(snapshot).length > 0 && entry.actionPresetId) {
    score += 15;
  }
  if (page === "library" && entry.pages.includes("library")) {
    score += 20;
  }
  if (page === "usage" && entry.id === "unused_assets" && snapshot.library.assets.length > 3) {
    score += 30;
  }
  return score;
}

function shouldIncludeEntry(
  entry: AssistantRecommendationCatalogEntry,
  page: AssistantRecommendationPage,
  snapshot: AssistantContextSnapshot,
  project?: AssistantProjectContext | null
): boolean {
  if (!entry.pages.includes(page) && page !== "home") {
    return false;
  }
  if (entry.id === "continue_project" && !project && snapshot.projects.length === 0) {
    return false;
  }
  if (entry.id === "motion_ready_available" && motionReadyCharacters(snapshot).length === 0) {
    return false;
  }
  if (entry.id === "unused_assets" && snapshot.library.assets.length < 2) {
    return false;
  }
  if (page === "home") {
    return entry.pages.includes("home") || entry.category === "trending" || entry.category === "hidden_possibilities";
  }
  return entry.pages.includes(page);
}

export function buildAssistantRecommendations(
  input: AssistantRecommendationEngineInput
): AssistantRecommendationEngineResult {
  const page = detectAssistantRecommendationPage(input.pathname);
  const project = input.activeProject ?? null;
  const candidates: AssistantRecommendation[] = [];

  for (const entry of ASSISTANT_RECOMMENDATION_CATALOG) {
    if (!shouldIncludeEntry(entry, page, input.snapshot, project ?? undefined)) {
      continue;
    }
    const { status, statusNoteKey } = computeStatus(entry, input.snapshot, project ?? undefined);
    const characterName = primaryCharacterName(input.snapshot, project ?? undefined);
    let titleKey = entry.titleKey;
    if (entry.id === "library_goal_with_character" && characterName) {
      titleKey = entry.titleKey;
    }

    candidates.push({
      id: entry.id,
      category: entry.category,
      emoji: entry.emoji,
      titleKey,
      descriptionKey: entry.descriptionKey,
      whyKey: entry.whyKey,
      promptMessage: entry.promptMessage,
      status,
      statusNoteKey,
      actionPresetId: entry.actionPresetId,
      fusionIntent: entry.fusionIntent,
      score: scoreEntry(entry, page, input.snapshot, project ?? undefined, status),
      characterName: characterName ?? undefined,
    });
  }

  const recommendations = rotateAssistantRecommendations({
    recommendations: candidates,
    sessionSeed: input.sessionSeed ?? `${page}:${input.pathname}`,
    recentIds: input.recentRecommendationIds,
    minCount: input.minCount ?? (page === "home" ? 12 : 8),
    maxCount: input.maxCount ?? (page === "home" ? 20 : 14),
  });

  return {
    page,
    recommendations,
    byCategory: groupRecommendationsByCategory(recommendations),
  };
}

/** @deprecated Legacy shim — use buildAssistantRecommendations instead. */
export function buildAssistantSuggestionsFromRecommendations(
  input: AssistantRecommendationEngineInput
): Array<{ id: string; messageKey: `assistant.recommendation.${string}.title`; promptMessage: string }> {
  return buildAssistantRecommendations(input).recommendations.map((row) => ({
    id: row.id,
    messageKey: row.titleKey,
    promptMessage: row.promptMessage,
  }));
}
