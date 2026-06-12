import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { upsertHomeCheffProjectRecord } from "@/server/projects/homecheff-project-service";
import { stripUnrelatedOwnerData } from "@/lib/homecheff-project-package-core";
import type { HomeCheffProjectPackage, HomeCheffShareMode } from "@/types/homecheff-project-package";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: { project: HomeCheffProjectPackage; shareMode?: HomeCheffShareMode };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.project?.id || !body.project.title) {
    return NextResponse.json({ error: "Missing project" }, { status: 400 });
  }

  const project = {
    ...body.project,
    ownerId: user.id,
    updatedAt: new Date().toISOString(),
  };

  await upsertHomeCheffProjectRecord(user.id, project);

  const exportable =
    body.shareMode && body.shareMode !== "private_backup"
      ? stripUnrelatedOwnerData(project)
      : project;

  return NextResponse.json({ ok: true, project: exportable });
}
