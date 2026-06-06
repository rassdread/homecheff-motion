export function studioWorkspaceHref(storyboardId: string): string {
  return `/studio/workspace?storyboardId=${encodeURIComponent(storyboardId)}`;
}

export function studioClassicEditorHref(storyboardId: string): string {
  return `/studio/storyboards/${encodeURIComponent(storyboardId)}/classic`;
}
