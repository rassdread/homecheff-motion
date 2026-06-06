import { createStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import { rememberRecentStoryboardId } from "@/lib/studio-recent-storyboard";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

export type CreateDefaultStudioStoryboardResult =
  | { ok: true; storyboardId: string; href: string }
  | { ok: false; error: string; status?: number };

export async function createDefaultStudioStoryboard(
  title: string
): Promise<CreateDefaultStudioStoryboardResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { ok: false, error: "Title is required" };
  }

  const res = await createStudioStoryboardApi({
    title: trimmedTitle,
    description: "",
  });

  if (!res.ok) {
    const payload = res.data as { error?: string };
    return {
      ok: false,
      error: payload.error ?? "Could not create story",
      status: res.status,
    };
  }

  const storyboardId = res.data.storyboard.id;
  rememberRecentStoryboardId(storyboardId);

  return {
    ok: true,
    storyboardId,
    href: studioWorkspaceHref(storyboardId),
  };
}
