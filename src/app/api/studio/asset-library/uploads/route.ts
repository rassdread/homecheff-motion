import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listUserLibraryUploads } from "@/server/studio/studio-user-upload-library-blob";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const uploads = await listUserLibraryUploads(user.id);
  return NextResponse.json({ ok: true, uploads });
}
