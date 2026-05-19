import { NextResponse } from "next/server";
import { syncActiveAnimationProjectsForUser } from "@/server/animation-projects/sync-active-projects";
import { requireActiveUser } from "@/server/auth/permissions";

/** Background orchestration for gallery: poll provider jobs, merge, and write final export rows. */
export async function POST() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  try {
    const summary = await syncActiveAnimationProjectsForUser(user.id);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync active projects." },
      { status: 500 }
    );
  }
}
