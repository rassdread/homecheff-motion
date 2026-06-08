import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteUserAccountProfile,
  patchUserAccountProfile,
  readUserAccountProfile,
} from "@/server/studio/user-account-profile-blob";
import type { UserAccountProfilePatch, UserAccountResponse } from "@/types/user-account-profile";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const profile = await readUserAccountProfile({ userId: user.id, email: user.email });
  const body: UserAccountResponse = { email: user.email, profile };
  return NextResponse.json({ ok: true, ...body }, { status: 200 });
}

export async function PATCH(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let patch: UserAccountProfilePatch;
  try {
    patch = (await request.json()) as UserAccountProfilePatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const profile = await patchUserAccountProfile({
    userId: user.id,
    email: user.email,
    patch,
  });
  const body: UserAccountResponse = { email: user.email, profile };
  return NextResponse.json({ ok: true, ...body }, { status: 200 });
}

export async function DELETE() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  await deleteUserAccountProfile(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}
