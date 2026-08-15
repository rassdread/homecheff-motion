import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  loadStudioAccountOverview,
  loadStudioAccountSummary,
} from "@/server/studio-account/studio-account-service";
import {
  patchStudioCreditSettings,
} from "@/server/studio-account/ensure-studio-account";
import type { StudioCreditSettingsPatch } from "@/types/studio-account";

export async function GET(request: NextRequest) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const view = request.nextUrl.searchParams.get("view");
  const overview =
    view === "summary"
      ? await loadStudioAccountSummary(user.id, user.email)
      : await loadStudioAccountOverview(user.id, user.email);
  return NextResponse.json({ ok: true, ...overview }, { status: 200 });
}

export async function PATCH(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let patch: StudioCreditSettingsPatch;
  try {
    patch = (await request.json()) as StudioCreditSettingsPatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  await patchStudioCreditSettings(user.id, patch);
  const overview = await loadStudioAccountOverview(user.id, user.email);
  return NextResponse.json({ ok: true, ...overview }, { status: 200 });
}
