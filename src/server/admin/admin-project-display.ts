import type { AdminProjectDisplay } from "@/types/admin-project-display";

export type AdminProjectDisplaySource = {
  id: string;
  title: string | null;
  status: string;
  projectType: string;
  instantMode: string | null;
  sourceProjectId: string | null;
  studioSourceStoryboardId: string | null;
  instantPreviousFinalVideoUrl: string | null;
  createdAt: Date;
  owner: { email: string };
  images: { previewUrl: string | null }[];
  fullRerenderDraft: { projectId: string } | null;
};

export function resolveAdminProjectThumbnail(project: {
  instantPreviousFinalVideoUrl?: string | null;
  images?: { previewUrl: string | null }[];
}): string | null {
  const fromImage = project.images?.[0]?.previewUrl?.trim();
  if (fromImage) {
    return fromImage;
  }
  const fromFinal = project.instantPreviousFinalVideoUrl?.trim();
  return fromFinal || null;
}

export function toAdminProjectDisplay(
  project: AdminProjectDisplaySource,
  renderType: string | null = null
): AdminProjectDisplay {
  return {
    projectId: project.id,
    projectTitle: project.title,
    ownerEmail: project.owner.email,
    status: project.status,
    projectType: project.projectType,
    instantMode: project.instantMode,
    sourceProjectId: project.sourceProjectId,
    studioSourceStoryboardId: project.studioSourceStoryboardId,
    hasFullRerenderDraft: project.fullRerenderDraft != null,
    thumbnailUrl: resolveAdminProjectThumbnail(project),
    createdAt: project.createdAt.toISOString(),
    renderType,
    isKnown: true,
  };
}

export function buildAdminProjectDisplayMap(
  projects: AdminProjectDisplaySource[]
): Map<string, AdminProjectDisplay> {
  return new Map(projects.map((p) => [p.id, toAdminProjectDisplay(p)]));
}

export function resolveAdminProjectDisplay(
  map: Map<string, AdminProjectDisplay>,
  input: {
    projectId: string | null | undefined;
    projectTitle?: string | null;
    ownerEmail?: string | null;
    status?: string | null;
    renderType?: string | null;
    createdAt?: string | null;
  }
): AdminProjectDisplay | null {
  const projectId = input.projectId?.trim();
  if (!projectId) {
    return null;
  }

  const known = map.get(projectId);
  if (known) {
    return {
      ...known,
      renderType: input.renderType ?? known.renderType,
      ownerEmail: input.ownerEmail ?? known.ownerEmail,
      projectTitle: input.projectTitle ?? known.projectTitle,
      status: input.status ?? known.status,
    };
  }

  return {
    projectId,
    projectTitle: input.projectTitle ?? null,
    ownerEmail: input.ownerEmail ?? null,
    status: input.status ?? null,
    projectType: null,
    instantMode: null,
    sourceProjectId: null,
    studioSourceStoryboardId: null,
    hasFullRerenderDraft: false,
    thumbnailUrl: null,
    createdAt: input.createdAt ?? null,
    renderType: input.renderType ?? null,
    isKnown: false,
  };
}
