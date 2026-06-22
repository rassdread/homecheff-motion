import { persistHomeCheffProject, loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  markHcProjectSynced,
  resolveHcProjectOrigin,
  stampHcProjectOrigin,
} from "@/lib/editor-project-origin";
import {
  canRestoreFromServer,
  isAnalysisBlockingRestore,
} from "@/lib/editor-project-restore";
import type { EditorVisionAnalysisStatus } from "@/lib/editor-vision-analysis-run";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export async function fetchHcProjectFromServer(projectId: string): Promise<HomeCheffProjectPackage | null> {
  try {
    const res = await fetch(`/api/projects/hc/${encodeURIComponent(projectId)}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; project?: HomeCheffProjectPackage };
    return body.project ?? null;
  } catch {
    return null;
  }
}

export async function syncHcProjectToServer(project: HomeCheffProjectPackage): Promise<boolean> {
  try {
    const res = await fetch("/api/projects/hc/export", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function importHcProjectToServer(content: string): Promise<{
  ok: boolean;
  project?: HomeCheffProjectPackage;
  copied?: boolean;
}> {
  try {
    const res = await fetch("/api/projects/hc/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as {
      ok?: boolean;
      project?: HomeCheffProjectPackage;
      copied?: boolean;
    };
    if (body.project) {
      persistHomeCheffProject(stampHcProjectOrigin(body.project, "server"));
    }
    return { ok: Boolean(body.ok), project: body.project, copied: body.copied };
  } catch {
    return { ok: false };
  }
}

/** Prefer local, optionally merge from server when signed in and restore is allowed. */
export async function loadHcProjectResolved(
  projectId: string,
  options: {
    syncFromServer?: boolean;
    skipServerWithoutLocal?: boolean;
    userRequestedRestore?: boolean;
    analysisStatus?: EditorVisionAnalysisStatus | null;
  } = {}
): Promise<HomeCheffProjectPackage | null> {
  const local = loadHomeCheffProject(projectId);
  if (!options.syncFromServer) {
    return local;
  }

  const origin = resolveHcProjectOrigin(local);
  const gate = canRestoreFromServer({
    origin,
    localExists: Boolean(local),
    userRequestedRestore: options.userRequestedRestore,
    analysisStatus: options.analysisStatus,
  });

  if (!gate.allowed) {
    return local;
  }

  if (!local && options.skipServerWithoutLocal) {
    return null;
  }

  const remote = await fetchHcProjectFromServer(projectId);
  if (remote) {
    persistHomeCheffProject(stampHcProjectOrigin(remote, "server"));
    return remote;
  }
  return local;
}

export function persistHcProjectWithSync(
  project: HomeCheffProjectPackage,
  options: { syncToServer?: boolean } = {}
): HomeCheffProjectPackage {
  const persisted = persistHomeCheffProject(project);
  if (options.syncToServer) {
    void syncHcProjectToServer(persisted).then((ok) => {
      if (ok) {
        persistHomeCheffProject(markHcProjectSynced(persisted));
      }
    });
  }
  return persisted;
}
