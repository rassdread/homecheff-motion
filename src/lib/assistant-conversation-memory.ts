import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";

export type AssistantConversationMemory = {
  lastEntities: string[];
  lastCharacter?: string;
  lastCharacterId?: string;
  lastAssetId?: string;
  lastProjectId?: string | null;
  lastIntent?: string;
  lastClusterId?: string;
  guidanceTopic?: string;
  guidanceStep?: number;
  lastUserMessage?: string;
};

export const EMPTY_CONVERSATION_MEMORY: AssistantConversationMemory = {
  lastEntities: [],
};

const PRONOUN_PATTERNS = [
  /\bhem\b/i,
  /\bhaar\b/i,
  /\bdie\b/i,
  /\bdezelfde\b/i,
  /\bvorige\b/i,
  /\bopnieuw\b/i,
  /\bzoiets\b/i,
  /\bit\b/i,
  /\bthat\b/i,
  /\bsame\b/i,
  /\bprevious\b/i,
  /\bagain\b/i,
];

export function isPronounFollowUp(message: string): boolean {
  const text = message.trim();
  if (text.length > 80) {
    return false;
  }
  return PRONOUN_PATTERNS.some((pattern) => pattern.test(text));
}

export function resolvePronounMessage(
  message: string,
  memory: AssistantConversationMemory,
  studio?: AssistantStudioContext | null
): string {
  if (!isPronounFollowUp(message)) {
    return message;
  }
  const subject =
    memory.lastCharacter ??
    studio?.projectMemory?.lastSuccessfulPlan?.characterName ??
    studio?.characters[0]?.assetName;
  if (!subject) {
    return message;
  }

  const text = message.toLowerCase();
  if (text.includes("moderner") || text.includes("modern")) {
    return `Maak ${subject} iets moderner`;
  }
  if (text.includes("animatie") || text.includes("animation")) {
    return `Maak een animatie van ${subject}`;
  }
  if (text.includes("variant") || text.includes("alternatief")) {
    return `Maak een variant van ${subject}`;
  }
  return `${message} (${subject})`;
}

export function updateConversationMemory(
  memory: AssistantConversationMemory,
  input: {
    message: string;
    interpretation?: AssistantInterpretation | null;
    studio?: AssistantStudioContext | null;
    clusterId?: string;
  }
): AssistantConversationMemory {
  const entities = [
    ...(input.interpretation?.extractedEntities.characters ?? []),
    ...(input.interpretation?.extractedEntities.people ?? []),
    ...(input.interpretation?.extractedEntities.assets ?? []),
  ].filter(Boolean);

  const character =
    input.studio?.projectMemory?.lastSuccessfulPlan?.characterName ??
    input.studio?.characters[0]?.assetName ??
    entities[0];

  const guidanceTopic =
    input.interpretation?.detectedIntent ?? input.clusterId ?? memory.guidanceTopic;
  const sameTopic = memory.guidanceTopic === guidanceTopic;

  return {
    lastEntities: entities.length > 0 ? entities.slice(0, 6) : memory.lastEntities,
    lastCharacter: character ?? memory.lastCharacter,
    lastCharacterId:
      input.studio?.characters[0]?.registryAssetId ?? memory.lastCharacterId,
    lastAssetId: input.studio?.assets[0]?.registryAssetId ?? memory.lastAssetId,
    lastProjectId: input.studio?.project?.id ?? memory.lastProjectId ?? null,
    lastIntent: input.interpretation?.detectedIntent ?? memory.lastIntent,
    lastClusterId: input.clusterId ?? memory.lastClusterId,
    guidanceTopic,
    guidanceStep: sameTopic ? (memory.guidanceStep ?? 0) + 1 : 1,
    lastUserMessage: input.message,
  };
}

export function buildGuidanceStepReply(
  memory: AssistantConversationMemory,
  locale?: string
): string | null {
  const nl = !locale || locale.startsWith("nl");
  if (!memory.guidanceTopic || !memory.guidanceStep || memory.guidanceStep < 2) {
    return null;
  }
  if (memory.guidanceTopic === "mascot_variant" && memory.guidanceStep === 2) {
    return nl
      ? "Stap 2 — Wat voor soort mascotte wil je? (chef, garden, cartoon, realistisch)"
      : "Step 2 — What kind of mascot do you want? (chef, garden, cartoon, realistic)";
  }
  return null;
}
