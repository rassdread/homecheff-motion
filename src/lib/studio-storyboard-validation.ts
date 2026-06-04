export const STUDIO_STORYBOARD_TITLE_MAX = 160;
export const STUDIO_STORYBOARD_TEXT_MAX = 4000;

export type StudioStoryboardCreateInput = {
  title: string;
  description?: string;
};

export type StudioStoryboardUpdateInput = {
  title?: string;
  description?: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function trimText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

export function validateStudioStoryboardCreateInput(
  raw: StudioStoryboardCreateInput
): ValidationResult<{ title: string; description: string }> {
  const title = raw.title?.trim() ?? "";
  if (!title) {
    return { ok: false, code: "TITLE_REQUIRED", message: "Title is required." };
  }
  if (title.length > STUDIO_STORYBOARD_TITLE_MAX) {
    return { ok: false, code: "TITLE_TOO_LONG", message: "Title is too long." };
  }
  return {
    ok: true,
    value: {
      title,
      description: trimText(raw.description, STUDIO_STORYBOARD_TEXT_MAX),
    },
  };
}

export function validateStudioStoryboardUpdateInput(
  raw: StudioStoryboardUpdateInput
): ValidationResult<{ title?: string; description?: string }> {
  const patch: { title?: string; description?: string } = {};

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

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
