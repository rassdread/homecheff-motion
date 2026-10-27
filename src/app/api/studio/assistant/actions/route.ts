import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { executeAssistantV23Action } from "@/server/assistant/assistant-tool-executor";

export const runtime = "nodejs";

/**
 * Authenticated adapter for allowlisted project actions.
 * Quotes stay quotes. This route does not start Vidu or ElevenLabs.
 */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const body = await request.json().catch(() => null);
  const result = await executeAssistantV23Action({ user, body });
  return NextResponse.json(result, { status: result.ok ? 200 : result.httpStatus });
}
