import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export type StoryboardOwnerRow = {
  ownerId: string;
};

export function studioStoryboardViewerCanView(
  viewer: Pick<SessionUser, "id" | "role">,
  storyboard: StoryboardOwnerRow
): boolean {
  return storyboard.ownerId === viewer.id || canAccessAdmin(viewer);
}

export function studioStoryboardViewerCanModify(
  viewer: Pick<SessionUser, "id">,
  storyboard: StoryboardOwnerRow
): boolean {
  return storyboard.ownerId === viewer.id;
}
