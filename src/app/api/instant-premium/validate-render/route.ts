import { NextResponse } from "next/server";
import { buildPremiumRenderValidationReport } from "@/lib/premium-render-validation";
import { runViduPromptLengthPreflight } from "@/lib/vidu-prompt-preflight";
import {
  validateInstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import { requireActiveUser } from "@/server/auth/permissions";

/** No-credit render validation — OCR, roles, prompt budget, text lock (no Vidu jobs). */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateInstantPremiumCreatePayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const viduCheck = runViduPromptLengthPreflight(validated.data);
  const report = buildPremiumRenderValidationReport({
    payload: validated.data,
    viduPromptChars: viduCheck.ok ? viduCheck.chars : viduCheck.debug.charsAfter,
    viduPromptOk: viduCheck.ok,
  });

  return NextResponse.json(
    {
      ok: report.ok,
      wouldCallVidu: report.wouldCallVidu,
      code: report.blockCode ?? null,
      blockMessage: report.blockMessage ?? null,
      validation: report,
    },
    { status: report.ok ? 200 : 400 }
  );
}
