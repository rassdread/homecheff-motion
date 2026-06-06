import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildStudioProjectMemory } from "@/server/studio/studio-project-memory-service";
import type { StudioProjectMemoryResponse } from "@/types/studio-project-memory";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const memory = await buildStudioProjectMemory(user.id);
  const body: StudioProjectMemoryResponse = { memory };
  return NextResponse.json(body, { status: 200 });
}
