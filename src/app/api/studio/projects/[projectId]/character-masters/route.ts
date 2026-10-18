import { NextResponse } from "next/server";
import type { PassionMasterQuote } from "@/lib/studio-passion-stage-a";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  confirmOwnedPassionMaster,
  previewOwnedPassionQuote,
} from "@/server/studio/studio-passion-character-masters-runtime";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const preview = await previewOwnedPassionQuote({
    userId: user.id,
    projectId,
    nowMs: Date.now(),
  });
  if (!preview) {
    return NextResponse.json({ error: "Project not found.", code: "PROJECT_FORBIDDEN" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    quote: preview.quote,
    attempts: preview.attempts,
    characters: preview.characters,
    saved: preview.saved,
    studioHcAvailable: preview.studioHcAvailable,
    walletSource: preview.walletSource,
    confirmationRequired: true,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  let body: {
    quote?: PassionMasterQuote;
    characterKey?: string;
    attempt?: number;
    confirmed?: boolean;
    retryConfirmed?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }
  if (body.confirmed !== true) {
    return NextResponse.json(
      { error: "Confirm the signed quote in Studio before generation.", code: "CONFIRMATION_REQUIRED" },
      { status: 402 }
    );
  }
  const result = await confirmOwnedPassionMaster({
    userId: user.id,
    projectId,
    presentedQuote: body.quote ?? null,
    characterKey: body.characterKey ?? "",
    attempt: body.attempt ?? 0,
    confirmed: true,
    retryConfirmed: body.retryConfirmed === true,
    nowMs: Date.now(),
  });
  if (!result.ok) {
    const status = result.code === "PROJECT_FORBIDDEN" ? 404 : result.code === "INSUFFICIENT_CREDITS" ? 402 : 409;
    return NextResponse.json({ error: result.code, code: result.code }, { status });
  }
  return NextResponse.json({ ok: true, master: result.result });
}
