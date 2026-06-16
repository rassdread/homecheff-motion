import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type {
  AssistantProjectMemory,
  AssistantProjectMemoryLastPlan,
  AssistantProjectMemoryTurn,
} from "@/types/assistant-project-memory";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { AssistantActionId } from "@/lib/assistant-action-registry";

export const ASSISTANT_MEMORY_METADATA_KEY = "assistantMemory";

export function readAssistantProjectMemory(
  project: HomeCheffProjectPackage
): AssistantProjectMemory | null {
  const raw = project.metadata[ASSISTANT_MEMORY_METADATA_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as AssistantProjectMemory;
  if (row.version !== 1) {
    return null;
  }
  return row;
}

export function createEmptyAssistantProjectMemory(): AssistantProjectMemory {
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedAt: now,
    presets: [],
    styles: [],
    routes: [],
    generatedAssetIds: [],
    characterIds: [],
    characterNames: [],
    preferredDurations: [],
    favoriteOutputIds: [],
    recentTurns: [],
  };
}

function uniquePush<T>(list: T[], value: T, max = 12): T[] {
  return [value, ...list.filter((row) => row !== value)].slice(0, max);
}

export function appendAssistantProjectMemoryTurn(
  memory: AssistantProjectMemory,
  turn: Omit<AssistantProjectMemoryTurn, "at"> & { at?: string }
): AssistantProjectMemory {
  const at = turn.at ?? new Date().toISOString();
  const entry: AssistantProjectMemoryTurn = { ...turn, at };
  return {
    ...memory,
    updatedAt: at,
    presets: turn.presetId ? uniquePush(memory.presets, turn.presetId) : memory.presets,
    routes: turn.route ? uniquePush(memory.routes, turn.route) : memory.routes,
    characterIds: turn.characterId
      ? uniquePush(memory.characterIds, turn.characterId)
      : memory.characterIds,
    characterNames: turn.characterName
      ? uniquePush(memory.characterNames, turn.characterName)
      : memory.characterNames,
    styles: turn.style ? uniquePush(memory.styles, turn.style) : memory.styles,
    recentTurns: [entry, ...memory.recentTurns].slice(0, 20),
  };
}

export function rememberAssistantProjectPlan(
  memory: AssistantProjectMemory,
  plan: AssistantProjectMemoryLastPlan
): AssistantProjectMemory {
  return {
    ...memory,
    updatedAt: plan.at,
    lastSuccessfulPlan: plan,
    presets: plan.presetId ? uniquePush(memory.presets, plan.presetId) : memory.presets,
    characterIds: plan.characterId
      ? uniquePush(memory.characterIds, plan.characterId)
      : memory.characterIds,
    characterNames: plan.characterName
      ? uniquePush(memory.characterNames, plan.characterName)
      : memory.characterNames,
    preferredDurations:
      plan.durationSeconds != null
        ? uniquePush(memory.preferredDurations, plan.durationSeconds, 6)
        : memory.preferredDurations,
    routes: plan.route ? uniquePush(memory.routes, plan.route) : memory.routes,
    styles: plan.style ? uniquePush(memory.styles, plan.style) : memory.styles,
  };
}

export function patchAssistantProjectMemory(
  project: HomeCheffProjectPackage,
  memory: AssistantProjectMemory
): HomeCheffProjectPackage {
  return {
    ...project,
    updatedAt: memory.updatedAt,
    metadata: {
      ...project.metadata,
      [ASSISTANT_MEMORY_METADATA_KEY]: memory,
    },
  };
}

export function buildProjectMemoryReuseReply(
  memory: AssistantProjectMemory,
  locale?: string
): string | null {
  const nl = !locale || locale.startsWith("nl");
  const plan = memory.lastSuccessfulPlan;
  if (!plan) {
    return null;
  }
  const bullets: string[] = [];
  if (plan.characterName) {
    bullets.push(plan.characterName);
  }
  if (plan.presetId) {
    bullets.push(plan.presetId.replace(/_/g, " "));
  }
  if (plan.locationName) {
    bullets.push(plan.locationName);
  }
  if (plan.outfitName) {
    bullets.push(plan.outfitName);
  }
  if (plan.style) {
    bullets.push(plan.style);
  }
  if (bullets.length === 0) {
    return null;
  }
  return nl
    ? `Vorige keer gebruikte je: ${bullets.join(" · ")}. Wil je die opnieuw gebruiken?`
    : `Last time you used: ${bullets.join(" · ")}. Want to reuse those?`;
}

export function isProjectRepeatRequest(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("nog zo'n") ||
    text.includes("opnieuw") ||
    text.includes("zelfde als vorige") ||
    text.includes("again") ||
    text.includes("same as last") ||
    text.includes("reuse")
  );
}

export function projectMemoryPresetId(memory: AssistantProjectMemory): MotionActionPresetId | undefined {
  return memory.lastSuccessfulPlan?.presetId ?? memory.presets[0];
}

export function projectMemoryActionId(memory: AssistantProjectMemory): AssistantActionId | undefined {
  const route = memory.lastSuccessfulPlan?.route ?? memory.routes[0];
  if (!route) {
    return undefined;
  }
  if (route.includes("/animate/instant") || route.includes("/motion")) {
    return "create_motion_video";
  }
  if (route.includes("/studio/characters")) {
    return "create_character";
  }
  if (route.includes("/editor")) {
    return "create_fusion";
  }
  if (route.includes("/publish")) {
    return "create_publish_export";
  }
  return undefined;
}
