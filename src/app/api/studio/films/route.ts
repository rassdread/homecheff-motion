import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createOwnedFilmProject } from "@/server/studio/studio-film-preparation";

/**
 * Explicit film creation. POST /api/studio/creative-projects stays a general
 * project container and does not create a storyboard.
 */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    idempotencyKey?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const result = await createOwnedFilmProject({
    ownerId: user.id,
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    idempotencyKey: body.idempotencyKey,
  });
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus },
    );
  }
  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}
