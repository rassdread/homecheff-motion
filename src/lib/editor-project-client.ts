import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { EditorCanvasProjectListItem } from "@/lib/editor-project-payload";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function projectsPath(id?: string, suffix?: string): string {
  const base = id
    ? `/api/editor/projects/${encodeURIComponent(id)}${suffix ?? ""}`
    : "/api/editor/projects";
  return sameOriginApiPath(base);
}

type ProjectBody = {
  ok?: boolean;
  project?: EditorCanvasDocument | null;
  projects?: EditorCanvasProjectListItem[];
  updatedAt?: string | null;
  error?: string;
};

export async function fetchEditorProjects(options?: {
  status?: "active" | "archived";
  limit?: number;
}): Promise<{ ok: boolean; projects: EditorCanvasProjectListItem[]; error?: string }> {
  const params = new URLSearchParams();
  if (options?.status) {
    params.set("status", options.status);
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  const q = params.toString();
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath() + (q ? `?${q}` : ""));
  return {
    ok: result.ok,
    projects: result.data.projects ?? [],
    error: result.data.error,
  };
}

export async function fetchEditorProject(projectId: string): Promise<{
  ok: boolean;
  project: EditorCanvasDocument | null;
  updatedAt: string | null;
  error?: string;
}> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(projectId));
  return {
    ok: result.ok,
    project: result.data.project ?? null,
    updatedAt: result.data.updatedAt ?? null,
    error: result.data.error,
  };
}

export async function saveEditorProject(
  projectId: string,
  payload: EditorCanvasDocument,
  name?: string
): Promise<{ ok: boolean; updatedAt: string | null; error?: string }> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(projectId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, name }),
  });
  return {
    ok: result.ok,
    updatedAt: result.data.updatedAt ?? null,
    error: result.data.error,
  };
}

export async function createEditorProject(payload: EditorCanvasDocument): Promise<{
  ok: boolean;
  project: EditorCanvasDocument | null;
  error?: string;
}> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  return {
    ok: result.ok,
    project: result.data.project ?? null,
    error: result.data.error,
  };
}

export async function forkEditorProject(sourceId: string, newId: string): Promise<{
  ok: boolean;
  project: EditorCanvasDocument | null;
  error?: string;
}> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(sourceId, "/fork"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newId }),
  });
  return {
    ok: result.ok,
    project: result.data.project ?? null,
    error: result.data.error,
  };
}

export async function archiveEditorProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(projectId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "archived" }),
  });
  return { ok: result.ok, error: result.data.error };
}

export async function restoreEditorProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(projectId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "active" }),
  });
  return { ok: result.ok, error: result.data.error };
}

export async function deleteEditorProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await fetchSameOriginJson<ProjectBody>(projectsPath(projectId), {
    method: "DELETE",
  });
  return { ok: result.ok, error: result.data.error };
}
