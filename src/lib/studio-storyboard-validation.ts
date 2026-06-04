import { isStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

export const STUDIO_STORYBOARD_TITLE_MAX = 160;
export const STUDIO_STORYBOARD_TEXT_MAX = 4000;

export type StudioStoryboardCreateInput = {
  title: string;
  description?: string;
  promptStyleProfile?: string;
};

export type StudioStoryboardUpdateInput = {
  title?: string;
  description?: string;
  promptStyleProfile?: string;
  autoSelectImprovedImage?: boolean;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function trimText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

export function validateStudioStoryboardCreateInput(
  raw: StudioStoryboardCreateInput
): ValidationResult<{ title: string; description: string; promptStyleProfile: string }> {
  const title = raw.title?.trim() ?? "";
  if (!title) {
    return { ok: false, code: "TITLE_REQUIRED", message: "Title is required." };
  }
  if (title.length > STUDIO_STORYBOARD_TITLE_MAX) {
    return { ok: false, code: "TITLE_TOO_LONG", message: "Title is too long." };
  }
  const profile = raw.promptStyleProfile?.trim() ?? "commercial";
  if (!isStudioPromptStyleProfile(profile)) {
    return { ok: false, code: "INVALID_STYLE_PROFILE", message: "Invalid prompt style profile." };
  }
  return {
    ok: true,
    value: {
      title,
      description: trimText(raw.description, STUDIO_STORYBOARD_TEXT_MAX),
      promptStyleProfile: profile,
    },
  };
}

export function validateStudioStoryboardUpdateInput(
  raw: StudioStoryboardUpdateInput
): ValidationResult<{
  title?: string;
  description?: string;
  promptStyleProfile?: string;
  autoSelectImprovedImage?: boolean;
}> {
  const patch: {
    title?: string;
    description?: string;
    promptStyleProfile?: string;
    autoSelectImprovedImage?: boolean;
  } = {};

  if (raw.title !== undefined) {
    const title = raw.title.trim();
    if (!title) {
      return { ok: false, code: "TITLE_REQUIRED", message: "Title is required." };
    }
    if (title.length > STUDIO_STORYBOARD_TITLE_MAX) {
      return { ok: false, code: "TITLE_TOO_LONG", message: "Title is too long." };
    }
    patch.title = title;
  }

  if (raw.description !== undefined) {
    patch.description = trimText(raw.description, STUDIO_STORYBOARD_TEXT_MAX);
  }

  if (raw.promptStyleProfile !== undefined) {
    const profile = raw.promptStyleProfile.trim();
    if (!isStudioPromptStyleProfile(profile)) {
      return { ok: false, code: "INVALID_STYLE_PROFILE", message: "Invalid prompt style profile." };
    }
    patch.promptStyleProfile = profile;
  }

  if (raw.autoSelectImprovedImage !== undefined) {
    patch.autoSelectImprovedImage = Boolean(raw.autoSelectImprovedImage);
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
