/** Canonical Studio workspace URL (ADR-STUDIO-003 Option A). */

export function studioWorkspaceHref(
  storyboardId: string,
  options?: { stage?: string; sceneId?: string; continueInStudio?: boolean }
): string {
  const params = new URLSearchParams({
    storyboardId,
  });
  if (options?.stage) {
    params.set("stage", options.stage);
  }
  if (options?.sceneId) {
    params.set("sceneId", options.sceneId);
  }
  if (options?.continueInStudio) {
    params.set("continueInStudio", "1");
  }
  return `/studio?${params.toString()}`;
}

export function studioClassicEditorHref(storyboardId: string): string {
  return `/studio/storyboards/${encodeURIComponent(storyboardId)}/classic`;
}
