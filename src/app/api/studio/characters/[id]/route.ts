import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteStudioCharacter,
  getStudioCharacterByIdForViewer,
  updateStudioCharacter,
} from "@/server/studio/studio-character-service";
import type { StudioCharacterDetailResponse } from "@/types/studio-api";
import type { StudioCharacterUpdateInput } from "@/lib/studio-character-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const character = await getStudioCharacterByIdForViewer(id, user);
  if (!character) {
    return NextResponse.json({ error: "Character not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const body: StudioCharacterDetailResponse = { character };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: StudioCharacterUpdateInput;
  try {
    body = (await request.json()) as StudioCharacterUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateStudioCharacter(id, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioCharacterDetailResponse = { character: result.character };
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await deleteStudioCharacter(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
