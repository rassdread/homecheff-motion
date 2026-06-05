export type AdminProjectHrefInput = {
  projectId: string;
  status?: string | null;
  hasFullRerenderDraft?: boolean;
  studioSourceStoryboardId?: string | null;
};

export type AdminProjectHrefResult = {
  href: string | null;
  studioHref: string | null;
};

export function shortProjectId(projectId: string, length = 8): string {
  const id = projectId.trim();
  if (id.length <= length + 3) {
    return id;
  }
  return `${id.slice(0, length)}…`;
}

export function getAdminProjectHref(input: AdminProjectHrefInput): AdminProjectHrefResult {
  const projectId = input.projectId?.trim();
  if (!projectId) {
    return { href: null, studioHref: null };
  }

  const encoded = encodeURIComponent(projectId);
  const isConcept =
    input.hasFullRerenderDraft === true || (input.status ?? "").toLowerCase() === "draft";
  const href = isConcept ? `/videos/${encoded}/edit-version` : `/videos/${encoded}`;

  const studioId = input.studioSourceStoryboardId?.trim();
  const studioHref =
    studioId ? `/studio/storyboards/${encodeURIComponent(studioId)}` : null;

  return { href, studioHref };
}

export function formatAdminProjectMode(input: {
  projectType?: string | null;
  instantMode?: string | null;
  renderType?: string | null;
  sourceProjectId?: string | null;
}): string {
  if (input.renderType?.trim()) {
    return input.renderType.trim();
  }
  if (input.sourceProjectId?.trim()) {
    return "concept";
  }
  if (input.projectType === "instant_premium") {
    return input.instantMode === "story" ? "story" : "transition";
  }
  if (input.projectType === "classic") {
    return "classic";
  }
  return input.projectType?.trim() || "—";
}
