import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createPromptPreset,
  listPromptPresetsForOwner,
  type StudioPromptPresetPayload,
} from "@/server/studio-library/prompt-preset-service";
import type { StudioPromptPresetScope } from "@/lib/studio-library-types";

/** Storage only — no Prompt Matrix optimization (S.6). */
export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? "all") as StudioPromptPresetScope | "all";
  const projectId = url.searchParams.get("projectId");

  const rows = await listPromptPresetsForOwner({
    ownerId: user.id,
    scope,
    projectId,
  });
  return NextResponse.json({
    presets: rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      scope: p.scope,
      projectId: p.projectId,
      preset: p.presetJson,
      tags: Array.isArray(p.tagsJson) ? p.tagsJson : [],
      favorite: p.favorite,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
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

  const name = typeof body.name === "string" ? body.name : "";
  const preset =
    body.preset && typeof body.preset === "object" && !Array.isArray(body.preset)
      ? (body.preset as StudioPromptPresetPayload)
      : {};

  try {
    const row = await createPromptPreset({
      ownerId: user.id,
      name,
      description: typeof body.description === "string" ? body.description : "",
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      scope: typeof body.scope === "string" ? (body.scope as StudioPromptPresetScope) : "user",
      preset,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [],
    });
    return NextResponse.json(
      {
        preset: {
          id: row.id,
          name: row.name,
          description: row.description,
          scope: row.scope,
          projectId: row.projectId,
          preset: row.presetJson,
          tags: Array.isArray(row.tagsJson) ? row.tagsJson : [],
          favorite: row.favorite,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed.", code: "validation" },
      { status: 400 }
    );
  }
}
