/**
 * Allowlisted Studio actions for the project assistant.
 * The browser never supplies a price. Unknown actions fail closed.
 */

export const STUDIO_V23_ACTIONS = [
  "CREATE_FILM_PROJECT",
  "OPEN_PROJECT",
  "ADD_SCENE",
  "UPDATE_SCENE",
  "SELECT_SCENE",
  "ASSIGN_CHARACTER",
  "OPEN_TIMELINE",
  "REORDER_SCENES",
  "REVERSE_TIMELINE_STORY",
  "UPDATE_TIMELINE_VOLUME",
  "OPEN_MEDIA_LIBRARY",
  "PREPARE_EXPORT",
  "QUOTE_SCENE_VIDEO",
  "QUOTE_SCENE_DIALOGUE",
  "ASSOCIATE_CHARACTER_REFERENCE",
] as const;

export type StudioV23ActionName = (typeof STUDIO_V23_ACTIONS)[number];

const ACTION_SET = new Set<string>(STUDIO_V23_ACTIONS);

export const STUDIO_V23_WRITE_ACTIONS = new Set<StudioV23ActionName>([
  "CREATE_FILM_PROJECT",
  "ADD_SCENE",
  "UPDATE_SCENE",
  "ASSIGN_CHARACTER",
  "REORDER_SCENES",
  "REVERSE_TIMELINE_STORY",
  "UPDATE_TIMELINE_VOLUME",
  "ASSOCIATE_CHARACTER_REFERENCE",
]);

export const STUDIO_V23_DESTRUCTIVE_ACTIONS = new Set<StudioV23ActionName>([
  "REORDER_SCENES",
  "REVERSE_TIMELINE_STORY",
]);

export const STUDIO_V23_QUOTE_ACTIONS = new Set<StudioV23ActionName>([
  "QUOTE_SCENE_VIDEO",
  "QUOTE_SCENE_DIALOGUE",
]);

export type StudioV23Request = {
  action: StudioV23ActionName;
  confirmed: boolean;
  confirmDestructive: boolean;
  resolvePending: "apply" | "keep_manual" | null;
  pendingFields: string[];
  idempotencyKey: string | null;
  projectId: string | null;
  sceneId: string | null;
  characterId: string | null;
  assetId: string | null;
  title: string | null;
  description: string | null;
  dialogueText: string | null;
  dialogueTextSet: boolean;
  actionText: string | null;
  emotion: string | null;
  characterIds: string[] | null;
  sceneIds: string[] | null;
  volume: number | null;
  trackId: string | null;
  prompt: string | null;
  voiceProfile: string | null;
  expectedUpdatedAt: string | null;
};

export type StudioV23SceneContext = {
  id: string;
  order: number;
  title: string;
  dialogueText?: string | null;
};

const SCENE_WORDS: Record<string, number> = {
  een: 1,
  one: 1,
  twee: 2,
  two: 2,
  drie: 3,
  three: 3,
  vier: 4,
  four: 4,
  vijf: 5,
  five: 5,
};

export function shortenDialogue(text: string): string | null {
  const clean = text.trim();
  if (clean.length < 8) return null;
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1) return sentences.slice(0, -1).join(" ").trim();
  const words = clean.split(/\s+/);
  if (words.length < 4) return null;
  const keep = Math.max(2, Math.ceil(words.length * 0.6));
  return words.slice(0, keep).join(" ");
}

export function manualEditConflicts(pendingFields: string[], patch: Record<string, unknown>): string[] {
  return pendingFields.filter((field) => Object.prototype.hasOwnProperty.call(patch, field));
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function idList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return ids.length > 0 ? ids.map((item) => item.trim()).slice(0, 40) : null;
}

export function parseStudioV23Request(body: unknown): { ok: true; value: StudioV23Request } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Action body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const action = typeof raw.action === "string" ? raw.action.trim() : "";
  if (!ACTION_SET.has(action)) {
    return { ok: false, message: "Unknown action." };
  }
  if ("requiredCredits" in raw || "price" in raw || "executeProvider" in raw || "sql" in raw) {
    return { ok: false, message: "The assistant cannot accept a client price or a provider execution flag." };
  }
  const pendingFields = Array.isArray(raw.pendingFields)
    ? raw.pendingFields.filter((item): item is string => typeof item === "string").slice(0, 12)
    : [];
  const resolve = raw.resolvePending === "apply" || raw.resolvePending === "keep_manual" ? raw.resolvePending : null;
  const volume = typeof raw.volume === "number" && Number.isInteger(raw.volume) ? raw.volume : null;
  return {
    ok: true,
    value: {
      action: action as StudioV23ActionName,
      confirmed: raw.confirmed === true,
      confirmDestructive: raw.confirmDestructive === true,
      resolvePending: resolve,
      pendingFields,
      idempotencyKey: text(raw.idempotencyKey, 80),
      projectId: text(raw.projectId, 80),
      sceneId: text(raw.sceneId, 80),
      characterId: text(raw.characterId, 80),
      assetId: text(raw.assetId, 80),
      title: text(raw.title, 160),
      description: text(raw.description, 4000),
      dialogueText: typeof raw.dialogueText === "string" ? raw.dialogueText.slice(0, 4000) : null,
      dialogueTextSet: raw.dialogueText === null || typeof raw.dialogueText === "string",
      actionText: text(raw.actionText, 2000),
      emotion: text(raw.emotion, 80),
      characterIds: idList(raw.characterIds),
      sceneIds: idList(raw.sceneIds),
      volume,
      trackId: text(raw.trackId, 80),
      prompt: text(raw.prompt, 4000),
      voiceProfile: text(raw.voiceProfile, 120),
      expectedUpdatedAt: text(raw.expectedUpdatedAt, 80),
    },
  };
}

export function resolveSceneReference(
  textValue: string,
  scenes: StudioV23SceneContext[],
  selectedSceneId: string | null,
): { sceneId: string } | { clarify: true } {
  const match = textValue.match(/sc[eè]ne\s+(\d{1,2}|een|twee|drie|vier|vijf|one|two|three|four|five)/i);
  if (match?.[1]) {
    const token = match[1].toLowerCase();
    const order = SCENE_WORDS[token] ?? Number(token);
    const scene = scenes.find((item) => item.order === order) ?? scenes[order - 1];
    if (!scene) return { clarify: true };
    return { sceneId: scene.id };
  }
  if (selectedSceneId && scenes.some((scene) => scene.id === selectedSceneId)) {
    return { sceneId: selectedSceneId };
  }
  if (scenes.length === 1) return { sceneId: scenes[0].id };
  return { clarify: true };
}

export type StudioV23Proposal =
  | { kind: "clarify" }
  | { kind: "action"; request: Record<string, unknown>; summary: string; destructive: boolean; quote: boolean };

export function proposeStudioV23Command(input: {
  text: string;
  projectId: string;
  scenes: StudioV23SceneContext[];
  selectedSceneId: string | null;
  selectedCharacterId: string | null;
}): StudioV23Proposal {
  const textValue = input.text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!textValue) return { kind: "clarify" };

  const scene = resolveSceneReference(textValue, input.scenes, input.selectedSceneId);
  const sceneId = "sceneId" in scene ? scene.sceneId : null;

  if (hasCommand(textValue, ["voeg een scène toe", "voeg een scene toe", "add a scene", "nieuwe scène", "new scene"])) {
    return action("ADD_SCENE", { projectId: input.projectId, title: "Nieuwe scène" }, "Add a scene", false, false);
  }

  if (hasCommand(textValue, ["maak de dialoog korter", "shorten the dialogue", "korter dialoog"])) {
    if (!sceneId) return { kind: "clarify" };
    const current = input.scenes.find((item) => item.id === sceneId)?.dialogueText ?? "";
    const next = shortenDialogue(current);
    if (!next) return { kind: "clarify" };
    return action(
      "UPDATE_SCENE",
      { projectId: input.projectId, sceneId, dialogueText: next },
      "Shorten the selected scene dialogue",
      false,
      false,
    );
  }

  if (hasCommand(textValue, ["verander de beschrijving", "change the description", "update description"])) {
    if (!sceneId) return { kind: "clarify" };
    return { kind: "clarify" };
  }

  if (hasCommand(textValue, ["zet de laatste scène vooraan", "reverse the scenes", "draai de volgorde om"])) {
    return action("REVERSE_TIMELINE_STORY", { projectId: input.projectId }, "Reverse the timeline story order", true, false);
  }

  if (hasCommand(textValue, ["open mijn tijdlijn", "open the timeline", "open tijdlijn"])) {
    return action("OPEN_TIMELINE", { projectId: input.projectId }, "Open the timeline", false, false);
  }

  if (hasCommand(textValue, ["offerte video", "video quote", "quote video", "bereid video voor"])) {
    if (!sceneId) return { kind: "clarify" };
    return action("QUOTE_SCENE_VIDEO", { projectId: input.projectId, sceneId }, "Prepare a video quote", false, true);
  }

  if (hasCommand(textValue, ["offerte stem", "voice quote", "quote voice", "bereid stem voor"])) {
    if (!sceneId) return { kind: "clarify" };
    return action(
      "QUOTE_SCENE_DIALOGUE",
      {
        projectId: input.projectId,
        sceneId,
        ...(input.selectedCharacterId ? { characterId: input.selectedCharacterId } : {}),
      },
      "Prepare a voice quote",
      false,
      true,
    );
  }

  if (hasCommand(textValue, ["open media", "open bibliotheek", "open library"])) {
    return action("OPEN_MEDIA_LIBRARY", { projectId: input.projectId }, "Open project media", false, false);
  }

  if (hasCommand(textValue, ["exporteer", "prepare export", "open export"])) {
    return action("PREPARE_EXPORT", { projectId: input.projectId }, "Open export", false, false);
  }

  return { kind: "clarify" };
}

function hasCommand(textValue: string, needles: string[]): boolean {
  return needles.some((needle) => textValue.includes(needle));
}

function action(
  name: StudioV23ActionName,
  request: Record<string, unknown>,
  summary: string,
  destructive: boolean,
  quote: boolean,
): StudioV23Proposal {
  return { kind: "action", request: { action: name, ...request }, summary, destructive, quote };
}
