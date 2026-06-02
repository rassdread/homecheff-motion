import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { auditAdminVideoStorage } from "@/server/animation-projects/admin-storage-audit";

export const dynamic = "force-dynamic";

/** Admin dashboard — aggregate video blob storage usage. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const summary = await auditAdminVideoStorage();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage audit failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
