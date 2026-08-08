import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createCreativeProject,
  listCreativeProjectsForOwner,
} from "@/server/studio-library/creative-project-service";
import { serializeCreativeProject } from "@/server/studio-library/serialize";
import type { StudioCreativeProjectStatus } from "@/lib/studio-library-types";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "active") as StudioCreativeProjectStatus | "all";
  const pinnedOnly = url.searchParams.get("pinned") === "1";
  const favoriteOnly = url.searchParams.get("favorite") === "1";
  const recent = url.searchParams.get("recent") === "1";
  const limit = Number(url.searchParams.get("limit") ?? "40");

  const rows = await listCreativeProjectsForOwner({
    ownerId: user.id,
    status,
    pinnedOnly,
    favoriteOnly,
    recent,
    limit: Number.isFinite(limit) ? limit : 40,
  });

  return NextResponse.json({ projects: rows.map(serializeCreativeProject) });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title : "";
  if (!title.trim()) {
    return NextResponse.json({ error: "title is required.", code: "validation" }, { status: 400 });
  }

  try {
    const row = await createCreativeProject({
      ownerId: user.id,
      title,
      description: typeof body.description === "string" ? body.description : "",
      status: typeof body.status === "string" ? (body.status as StudioCreativeProjectStatus) : "active",
      storyboardId: typeof body.storyboardId === "string" ? body.storyboardId : null,
      animationProjectId:
        typeof body.animationProjectId === "string" ? body.animationProjectId : null,
      homeCheffProjectId:
        typeof body.homeCheffProjectId === "string" ? body.homeCheffProjectId : null,
      editorCanvasProjectId:
        typeof body.editorCanvasProjectId === "string" ? body.editorCanvasProjectId : null,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [],
    });
    return NextResponse.json({ project: serializeCreativeProject(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create project.", code: "validation" },
      { status: 400 }
    );
  }
}
