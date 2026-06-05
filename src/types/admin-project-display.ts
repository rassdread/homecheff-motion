/** Shared admin UI metadata for linking to Motion / Studio projects. */

export type AdminProjectDisplay = {
  projectId: string;
  projectTitle: string | null;
  ownerEmail: string | null;
  status: string | null;
  projectType: string | null;
  instantMode: string | null;
  sourceProjectId: string | null;
  studioSourceStoryboardId: string | null;
  hasFullRerenderDraft: boolean;
  thumbnailUrl: string | null;
  createdAt: string | null;
  /** Render job type label when row is a credit/cost event. */
  renderType: string | null;
  /** False when project id exists but row is not in the live project index. */
  isKnown: boolean;
};
