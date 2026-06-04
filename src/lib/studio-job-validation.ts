import {
  STUDIO_JOB_TYPES,
  type StudioJobCreateInput,
  type StudioJobType,
} from "@/types/studio-job";

export function isStudioJobType(value: string): value is StudioJobType {
  return (STUDIO_JOB_TYPES as readonly string[]).includes(value);
}

export function parseStudioJobCreateInput(raw: unknown): StudioJobCreateInput | null {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const body = raw as Record<string, unknown>;
  const input: StudioJobCreateInput = {};

  if (Array.isArray(body.sceneIds)) {
    input.sceneIds = body.sceneIds.filter((id): id is string => typeof id === "string");
  }
  if (Array.isArray(body.imageIds)) {
    input.imageIds = body.imageIds.filter((id): id is string => typeof id === "string");
  }
  if (body.options && typeof body.options === "object") {
    const opts = body.options as Record<string, unknown>;
    input.options = {
      autoSelect: opts.autoSelect === undefined ? undefined : Boolean(opts.autoSelect),
    };
  }

  return input;
}

export function parseStudioJobCreateBody(raw: unknown): { type: StudioJobType; input: StudioJobCreateInput } | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.type !== "string" || !isStudioJobType(body.type)) {
    return null;
  }
  return {
    type: body.type,
    input: parseStudioJobCreateInput(body) ?? {},
  };
}
