/**
 * Executes an allowlisted Studio action through injected services.
 * Paid actions stop at the existing quote. This module cannot start a provider.
 */

import {
  STUDIO_V23_DESTRUCTIVE_ACTIONS,
  STUDIO_V23_QUOTE_ACTIONS,
  STUDIO_V23_WRITE_ACTIONS,
  manualEditConflicts,
  type StudioV23Request,
} from "@/lib/studio-v23-actions";

export type StudioV23Actor = {
  id: string;
  email: string;
  role: string;
};

export type StudioV23Failure = {
  ok: false;
  code: string;
  message: string;
  httpStatus: number;
  providerCalls: 0;
  creditsConsumed: 0;
};

export type StudioV23Success = {
  ok: true;
  status: "confirmation_required" | "completed" | "quote_ready" | "kept_manual";
  action: StudioV23Request["action"];
  providerCalls: 0;
  creditsConsumed: 0;
  href?: string;
  quote?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  conflicts?: string[];
};

export type StudioV23Outcome = StudioV23Success | StudioV23Failure;

type ServiceError = { code: string; message: string; httpStatus: number };

export type StudioV23Deps = {
  createFilm: (input: {
    ownerId: string;
    title: string;
    description: string;
    idempotencyKey: string | null;
  }) => Promise<unknown>;
  createScene: (ownerId: string, projectId: string, actor: StudioV23Actor, title: string) => Promise<unknown>;
  updateScene: (
    ownerId: string,
    projectId: string,
    sceneId: string,
    actor: StudioV23Actor,
    patch: {
      title?: string;
      description?: string;
      action?: string;
      emotion?: string;
      characterIds?: string[];
      dialogueText?: string | null;
    },
  ) => Promise<unknown>;
  reorderScenes: (ownerId: string, projectId: string, actor: StudioV23Actor, sceneIds: string[]) => Promise<unknown>;
  quoteVideo: (input: { user: StudioV23Actor; projectId: string; sceneId: string }) => Promise<unknown>;
  quoteDialogue: (input: {
    user: StudioV23Actor;
    projectId: string;
    sceneId: string;
    characterId?: string;
    voiceProfile?: string;
  }) => Promise<unknown>;
  getTimeline: (ownerId: string, projectId: string) => Promise<unknown>;
  setTrackVolume: (input: {
    ownerId: string;
    projectId: string;
    revision: number;
    trackId: string;
    volume: number;
  }) => Promise<unknown>;
  reverseStory: (ownerId: string, projectId: string) => Promise<unknown>;
  updateCharacterReference: (
    characterId: string,
    actor: StudioV23Actor,
    reference: { referenceImageUrl: string; referenceStorageKey: string },
  ) => Promise<unknown>;
  getAsset: (
    assetId: string,
    ownerId: string,
  ) => Promise<{ id: string; family: string; previewUrl: string; storageKey: string } | null>;
  getProject: (ownerId: string, projectId: string) => Promise<{ id: string; title: string } | null>;
  sceneInProject: (
    ownerId: string,
    projectId: string,
    sceneId: string,
  ) => Promise<{ id: string; updatedAt: string } | null>;
  characterInFilm: (ownerId: string, projectId: string, characterId: string) => Promise<boolean>;
  readIdempotency: (ownerId: string, projectId: string, key: string) => Promise<StudioV23Success | null>;
  saveIdempotency: (ownerId: string, projectId: string, key: string, value: StudioV23Success) => Promise<void>;
};

function fail(code: string, message: string, httpStatus: number): StudioV23Failure {
  return { ok: false, code, message, httpStatus, providerCalls: 0, creditsConsumed: 0 };
}

function serviceFailure(error: ServiceError): StudioV23Failure {
  return fail(error.code, error.message, error.httpStatus);
}

function readError(value: unknown): ServiceError | null {
  if (!value || typeof value !== "object" || !("error" in value)) return null;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const row = error as { code?: unknown; message?: unknown; httpStatus?: unknown };
  if (typeof row.code !== "string" || typeof row.message !== "string") return null;
  return {
    code: row.code,
    message: row.message,
    httpStatus: typeof row.httpStatus === "number" ? row.httpStatus : 400,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function href(projectId: string, section: string, extra?: Record<string, string | null>): string {
  const params = new URLSearchParams({ section });
  for (const [name, value] of Object.entries(extra ?? {})) {
    if (value) params.set(name, value);
  }
  return `/studio/projects/${encodeURIComponent(projectId)}?${params.toString()}`;
}

function needsConfirmation(request: StudioV23Request): boolean {
  if (STUDIO_V23_QUOTE_ACTIONS.has(request.action)) return !request.confirmed;
  if (STUDIO_V23_WRITE_ACTIONS.has(request.action)) return !request.confirmed;
  return !request.confirmed;
}

export async function executeStudioV23Action(
  input: { actor: StudioV23Actor; request: StudioV23Request },
  deps: StudioV23Deps,
): Promise<StudioV23Outcome> {
  const { actor, request } = input;
  if (STUDIO_V23_DESTRUCTIVE_ACTIONS.has(request.action) && request.confirmed && !request.confirmDestructive) {
    return fail("confirmation_required", "This change needs an explicit destructive confirmation.", 409);
  }

  if (request.action === "CREATE_FILM_PROJECT") {
    if (!request.confirmed) return confirmation(request, null);
    if (!request.title) return fail("validation", "A film title is required.", 400);
    const created = await deps.createFilm({
      ownerId: actor.id,
      title: request.title,
      description: request.description ?? request.prompt ?? "",
      idempotencyKey: request.idempotencyKey,
    });
    const createdError = readError(created);
    if (createdError) return serviceFailure(createdError);
    const row = record(created);
    const projectId = typeof row.projectId === "string" ? row.projectId : "";
    if (!projectId) return fail("validation", "The film project was not created.", 500);
    return completed(request, {
      href: href(projectId, "overview", { workflow: "film" }),
      result: {
        projectId,
        storyboardId: typeof row.storyboardId === "string" ? row.storyboardId : null,
        created: row.created === true,
      },
    });
  }

  if (!request.projectId) return fail("validation", "A project is required.", 400);
  const project = await deps.getProject(actor.id, request.projectId);
  if (!project) return fail("not_found", "Not found.", 404);

  if (request.idempotencyKey && request.confirmed) {
    const stored = await deps.readIdempotency(actor.id, request.projectId, request.idempotencyKey);
    if (stored) return { ...stored, result: { ...(stored.result ?? {}), idempotent: true } };
  }

  if (request.sceneId) {
    const scene = await deps.sceneInProject(actor.id, request.projectId, request.sceneId);
    if (!scene) return fail("not_found", "Not found.", 404);
    if (request.expectedUpdatedAt && request.expectedUpdatedAt !== scene.updatedAt && request.resolvePending !== "apply") {
      return fail("pending_manual_edit", "The scene changed. Review it before writing.", 409);
    }
  }

  if (needsConfirmation(request)) {
    if (!STUDIO_V23_QUOTE_ACTIONS.has(request.action)) return confirmation(request, null);
    const loaded = await loadQuote(actor, request, deps);
    if ("ok" in loaded) return loaded;
    return confirmation(request, loaded.quote);
  }

  const outcome = await perform(actor, request, deps);
  if (outcome.ok && outcome.status === "completed" && request.idempotencyKey) {
    await deps.saveIdempotency(actor.id, request.projectId, request.idempotencyKey, outcome);
  }
  return outcome;
}

async function loadQuote(
  actor: StudioV23Actor,
  request: StudioV23Request,
  deps: StudioV23Deps,
): Promise<{ quote: Record<string, unknown> } | StudioV23Failure> {
  if (!request.sceneId) return fail("validation", "A scene is required.", 400);
  const quote =
    request.action === "QUOTE_SCENE_VIDEO"
      ? await deps.quoteVideo({ user: actor, projectId: request.projectId!, sceneId: request.sceneId })
      : await deps.quoteDialogue({
          user: actor,
          projectId: request.projectId!,
          sceneId: request.sceneId,
          characterId: request.characterId ?? undefined,
          voiceProfile: request.voiceProfile ?? undefined,
        });
  const error = readError(quote);
  if (error) return serviceFailure(error);
  return { quote: record(quote) };
}

async function perform(
  actor: StudioV23Actor,
  request: StudioV23Request,
  deps: StudioV23Deps,
): Promise<StudioV23Outcome> {
  const projectId = request.projectId!;
  switch (request.action) {
    case "OPEN_PROJECT":
      return completed(request, { href: href(projectId, "overview") });
    case "OPEN_TIMELINE":
      return completed(request, { href: href(projectId, "timeline") });
    case "OPEN_MEDIA_LIBRARY":
      return completed(request, { href: href(projectId, "media") });
    case "PREPARE_EXPORT":
      return completed(request, { href: href(projectId, "export"), result: { executesRender: false } });
    case "SELECT_SCENE": {
      if (!request.sceneId) return fail("validation", "A scene is required.", 400);
      return completed(request, { href: href(projectId, "scenes", { scene: request.sceneId }) });
    }
    case "ADD_SCENE": {
      const created = await deps.createScene(actor.id, projectId, actor, request.title || "Nieuwe scène");
      const createdError = readError(created);
      if (createdError) return serviceFailure(createdError);
      const sceneId = typeof record(record(created).scene).id === "string" ? String(record(record(created).scene).id) : "";
      if (!sceneId) return fail("validation", "The scene was not created.", 500);
      return completed(request, {
        href: href(projectId, "scenes", { scene: sceneId }),
        result: { sceneId },
      });
    }
    case "UPDATE_SCENE":
    case "ASSIGN_CHARACTER":
      return updateScene(actor, request, deps);
    case "REORDER_SCENES": {
      if (!request.sceneIds || request.sceneIds.length < 2) {
        return fail("validation", "At least two scene ids are required.", 400);
      }
      const ordered = await deps.reorderScenes(actor.id, projectId, actor, request.sceneIds);
      const orderedError = readError(ordered);
      if (orderedError) return serviceFailure(orderedError);
      return completed(request, { href: href(projectId, "scenes") });
    }
    case "REVERSE_TIMELINE_STORY": {
      const reversed = await deps.reverseStory(actor.id, projectId);
      const reversedError = readError(reversed);
      if (reversedError) return serviceFailure(reversedError);
      return completed(request, { href: href(projectId, "timeline") });
    }
    case "UPDATE_TIMELINE_VOLUME": {
      if (request.volume == null || request.volume < 0 || request.volume > 100) {
        return fail("validation", "Volume must be a whole number from 0 to 100.", 400);
      }
      const timeline = await deps.getTimeline(actor.id, projectId);
      const timelineError = readError(timeline);
      if (timelineError) return serviceFailure(timelineError);
      const timelineRow = record(record(timeline).timeline);
      const tracks = Array.isArray(timelineRow.tracks) ? timelineRow.tracks.map((item) => record(item)) : [];
      const revision = typeof timelineRow.revision === "number" ? timelineRow.revision : null;
      if (!record(timeline).timeline || revision == null) return fail("not_found", "Create the timeline first.", 404);
      const track =
        tracks.find((item) => item.id === request.trackId) ?? tracks.find((item) => item.type === "MUSIC");
      const trackId = typeof track?.id === "string" ? track.id : "";
      if (!trackId) return fail("not_found", "Track not found.", 404);
      const saved = await deps.setTrackVolume({
        ownerId: actor.id,
        projectId,
        revision,
        trackId,
        volume: request.volume,
      });
      const savedError = readError(saved);
      if (savedError) return serviceFailure(savedError);
      return completed(request, { href: href(projectId, "timeline"), result: { trackId, volume: request.volume } });
    }
    case "QUOTE_SCENE_VIDEO":
    case "QUOTE_SCENE_DIALOGUE": {
      const loaded = await loadQuote(actor, request, deps);
      if ("ok" in loaded) return loaded;
      return {
        ok: true,
        status: "quote_ready",
        action: request.action,
        providerCalls: 0,
        creditsConsumed: 0,
        href: href(projectId, "scenes", { scene: request.sceneId }),
        quote: loaded.quote,
        result: { executesProvider: false },
      };
    }
    case "ASSOCIATE_CHARACTER_REFERENCE":
      return associateReference(actor, request, deps);
    case "CREATE_FILM_PROJECT":
      return fail("validation", "A film title is required.", 400);
    default:
      return fail("unknown_action", "Unknown action.", 400);
  }
}

async function updateScene(
  actor: StudioV23Actor,
  request: StudioV23Request,
  deps: StudioV23Deps,
): Promise<StudioV23Outcome> {
  if (!request.sceneId) return fail("validation", "A scene is required.", 400);
  const patch: {
    title?: string;
    description?: string;
    action?: string;
    emotion?: string;
    characterIds?: string[];
    dialogueText?: string | null;
  } = {};
  if (request.title) patch.title = request.title;
  if (request.description) patch.description = request.description;
  if (request.actionText) patch.action = request.actionText;
  if (request.emotion) patch.emotion = request.emotion;
  if (request.dialogueTextSet && request.action === "UPDATE_SCENE") patch.dialogueText = request.dialogueText;
  if (request.action === "ASSIGN_CHARACTER") {
    const characterIds = request.characterIds ?? (request.characterId ? [request.characterId] : null);
    if (!characterIds) return fail("validation", "A character is required.", 400);
    for (const characterId of characterIds) {
      const allowed = await deps.characterInFilm(actor.id, request.projectId!, characterId);
      if (!allowed) return fail("not_found", "Not found.", 404);
    }
    patch.characterIds = characterIds;
  }
  if (Object.keys(patch).length === 0) return fail("validation", "Nothing to update.", 400);
  const conflicts = manualEditConflicts(request.pendingFields, patch);
  if (conflicts.length > 0 && request.resolvePending !== "apply") {
    if (request.resolvePending === "keep_manual") {
      for (const field of conflicts) delete patch[field as keyof typeof patch];
      if (Object.keys(patch).length === 0) {
        return { ok: true, status: "kept_manual", action: request.action, providerCalls: 0, creditsConsumed: 0, conflicts };
      }
    } else {
      return fail("pending_manual_edit", "Save or review the manual edit before the assistant writes.", 409);
    }
  }
  const updated = await deps.updateScene(actor.id, request.projectId!, request.sceneId, actor, patch);
  const updatedError = readError(updated);
  if (updatedError) return serviceFailure(updatedError);
  const sceneId = typeof record(record(updated).scene).id === "string" ? String(record(record(updated).scene).id) : request.sceneId;
  return completed(request, {
    href: href(request.projectId!, "scenes", { scene: sceneId }),
    result: { sceneId },
  });
}

async function associateReference(
  actor: StudioV23Actor,
  request: StudioV23Request,
  deps: StudioV23Deps,
): Promise<StudioV23Outcome> {
  if (!request.characterId || !request.assetId) return fail("validation", "A character and an image are required.", 400);
  const allowed = await deps.characterInFilm(actor.id, request.projectId!, request.characterId);
  if (!allowed) return fail("not_found", "Not found.", 404);
  const asset = await deps.getAsset(request.assetId, actor.id);
  if (!asset) return fail("not_found", "Not found.", 404);
  if (asset.family !== "image") return fail("validation", "Choose an image from your library.", 400);
  if (!asset.previewUrl || !asset.storageKey) return fail("validation", "This image has no stored reference.", 400);
  const updated = await deps.updateCharacterReference(request.characterId, actor, {
    referenceImageUrl: asset.previewUrl,
    referenceStorageKey: asset.storageKey,
  });
  const updatedError = readError(updated);
  if (updatedError) return serviceFailure(updatedError);
  return completed(request, {
    href: href(request.projectId!, "characters", { character: request.characterId }),
    result: { characterId: request.characterId, assetId: asset.id },
  });
}

function confirmation(request: StudioV23Request, quote: Record<string, unknown> | null): StudioV23Success {
  return {
    ok: true,
    status: "confirmation_required",
    action: request.action,
    providerCalls: 0,
    creditsConsumed: 0,
    quote,
    href: request.projectId ? href(request.projectId, "overview") : undefined,
  };
}

function completed(request: StudioV23Request, extra: Pick<StudioV23Success, "href" | "result">): StudioV23Success {
  return {
    ok: true,
    status: "completed",
    action: request.action,
    providerCalls: 0,
    creditsConsumed: 0,
    ...extra,
  };
}
