export type EditorRouteQuery = {
  session?: string;
  hcProject?: string;
};

export function buildEditorRouteHref(query: EditorRouteQuery): string {
  const params = new URLSearchParams();
  const session = query.session?.trim();
  const hcProject = query.hcProject?.trim();
  if (session) {
    params.set("session", session);
  }
  if (hcProject) {
    params.set("hcProject", hcProject);
  }
  const qs = params.toString();
  return qs ? `/editor?${qs}` : "/editor";
}

export function editorRouteSearchEquals(
  current: URLSearchParams | string,
  target: EditorRouteQuery
): boolean {
  const read = (key: string): string => {
    if (typeof current === "string") {
      return new URLSearchParams(current.startsWith("?") ? current.slice(1) : current).get(key)?.trim() ?? "";
    }
    return current.get(key)?.trim() ?? "";
  };
  const session = target.session?.trim() ?? "";
  const hcProject = target.hcProject?.trim() ?? "";
  return read("session") === session && read("hcProject") === hcProject;
}

export function shouldReplaceEditorRoute(
  currentSearch: URLSearchParams | string,
  target: EditorRouteQuery
): boolean {
  const href = buildEditorRouteHref(target);
  if (typeof window !== "undefined") {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === href) {
      return false;
    }
  }
  return !editorRouteSearchEquals(currentSearch, target);
}

export function replaceEditorRouteIfNeeded(
  router: { replace: (href: string) => void },
  currentSearch: URLSearchParams | string,
  target: EditorRouteQuery
): boolean {
  if (!shouldReplaceEditorRoute(currentSearch, target)) {
    return false;
  }
  router.replace(buildEditorRouteHref(target));
  return true;
}
