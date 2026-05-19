import { NextResponse } from "next/server";
import {
  validateInstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import {
  instantPreflightHttpStatus,
  runInstantPremiumTextPreflight,
} from "@/server/instant-premium/instant-premium-preflight";
import { requireActiveUser } from "@/server/auth/permissions";

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

  const preflight = await runInstantPremiumTextPreflight(validated.data);
  if (!preflight.ok) {
    return NextResponse.json(
      {
        ok: false as const,
        error: preflight.error,
        code: preflight.code,
        blockMessage: preflight.blockMessage,
        warnings: preflight.warnings,
        images: preflight.images,
        visionUsed: preflight.visionUsed,
      },
      { status: instantPreflightHttpStatus(preflight) }
    );
  }

  return NextResponse.json(
    {
      ok: true as const,
      warnings: preflight.warnings,
      images: preflight.images,
      visionUsed: preflight.visionUsed,
    },
    { status: 200 }
  );
}
