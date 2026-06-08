import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import {
  emptyStudioWorkspaceState,
  mergeStudioWorkspaceState,
  parseStudioWorkspaceState,
  type StudioWorkspaceState,
  type StudioWorkspaceStatePatch,
} from "@/types/studio-workspace-state";

function workspaceStatePathname(ownerId: string, storyboardId: string): string {
  return `studio/${ownerId}/storyboards/${storyboardId}/workspace-state.json`;
}

export async function readStudioWorkspaceState(params: {
  ownerId: string;
  storyboardId: string;
}): Promise<StudioWorkspaceState> {
  const pathname = workspaceStatePathname(params.ownerId, params.storyboardId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return emptyStudioWorkspaceState(params);
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return emptyStudioWorkspaceState(params);
    }
    const raw = await res.json();
    const parsed = parseStudioWorkspaceState(raw);
    if (!parsed || parsed.storyboardId !== params.storyboardId) {
      return emptyStudioWorkspaceState(params);
    }
    return parsed;
  } catch {
    return emptyStudioWorkspaceState(params);
  }
}

async function writeStudioWorkspaceState(state: StudioWorkspaceState): Promise<void> {
  const pathname = workspaceStatePathname(state.ownerId, state.storyboardId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify(state), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_workspace_state",
    },
  });
}

export async function patchStudioWorkspaceState(params: {
  ownerId: string;
  storyboardId: string;
  patch: StudioWorkspaceStatePatch;
}): Promise<StudioWorkspaceState> {
  const current = await readStudioWorkspaceState({
    ownerId: params.ownerId,
    storyboardId: params.storyboardId,
  });
  const next = mergeStudioWorkspaceState(current, params.patch);
  await writeStudioWorkspaceState(next);
  return next;
}
