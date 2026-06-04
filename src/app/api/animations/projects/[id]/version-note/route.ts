import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { updateProjectVersionNote } from "@/server/animation-projects/update-version-note";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    kind?: string;
    targetId?: string;
    versionNote?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.kind !== "render" && body.kind !== "language") {
    return NextResponse.json({ error: "kind must be render or language." }, { status: 400 });
  }
  if (typeof body.targetId !== "string" || !body.targetId.trim()) {
    return NextResponse.json({ error: "targetId is required." }, { status: 400 });
  }

  const result = await updateProjectVersionNote({
    projectId: id,
    ownerId: user.id,
    isAdmin: user.role === "admin",
    kind: body.kind,
    targetId: body.targetId.trim(),
    versionNote: typeof body.versionNote === "string" ? body.versionNote : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 404 });
  }

  return NextResponse.json(result, { status: 200 });
}
