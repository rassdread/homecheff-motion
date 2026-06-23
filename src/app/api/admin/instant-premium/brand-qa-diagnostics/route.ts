import { NextResponse } from "next/server";
import { loadBrandQaDiagnosticResult } from "@/lib/brand-qa-diagnostics";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import type { BrandQaDiagnosticInput } from "@/types/brand-qa-analytics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as BrandQaDiagnosticInput;
  const result = await loadBrandQaDiagnosticResult(body);

  return NextResponse.json(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      result,
    },
    { status: 200 }
  );
}
