import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { upsertHomeCheffProjectRecord } from "@/server/projects/homecheff-project-service";
import {
  migrateHomeCheffPackage,
  parseHomeCheffProjectFile,
  validateHomeCheffProjectPackage,
} from "@/lib/homecheff-project-package-core";
import { importHcProjectAsCopy, validateImportPermissions } from "@/lib/homecheff-project-handoff";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: { content: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const parsed = migrateHomeCheffPackage(parseHomeCheffProjectFile(body.content));
    const validation = validateHomeCheffProjectPackage(parsed);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors.join(",") }, { status: 400 });
    }

    const isOwner = parsed.ownerId === user.id;
    const permission = validateImportPermissions(parsed, { userId: user.id, isOwner });
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason ?? "permission_denied" }, { status: 403 });
    }

    let project = parsed;
    let copied = false;
    if (permission.shouldCopy && !isOwner) {
      project = importHcProjectAsCopy(parsed, user.id);
      copied = true;
    } else {
      project = { ...parsed, ownerId: user.id };
    }

    await upsertHomeCheffProjectRecord(user.id, project);
    return NextResponse.json({ ok: true, project, copied });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "import_failed" },
      { status: 400 }
    );
  }
}
