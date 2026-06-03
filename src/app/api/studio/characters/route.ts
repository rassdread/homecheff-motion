import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createStudioCharacter,
  listStudioCharacters,
} from "@/server/studio/studio-character-service";
import type {
  StudioCharacterDetailResponse,
  StudioCharacterListResponse,
} from "@/types/studio-api";
import type { StudioCharacterCreateInput } from "@/lib/studio-character-validation";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const characters = await listStudioCharacters(user);
  const body: StudioCharacterListResponse = { characters };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: StudioCharacterCreateInput;
  try {
    body = (await request.json()) as StudioCharacterCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createStudioCharacter(user.id, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioCharacterDetailResponse = { character: result.character };
  return NextResponse.json(response, { status: 201 });
}
