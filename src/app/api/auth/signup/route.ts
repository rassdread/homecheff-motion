import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/server/auth/session";
import { hashInviteToken } from "@/server/auth/invite-token";
import { normalizeInviteRole } from "@/server/auth/permissions";

type SignupPayload = {
  email?: string;
  password?: string;
  /** Optional admin invite link — assigns role when valid. */
  inviteToken?: string;
};

/**
 * Public signup: anyone can register with role `user`.
 * First account in an empty database becomes `admin` (bootstrap).
 * Optional invite tokens still assign admin/power/user from admin-created links.
 */
export async function POST(request: Request) {
  let payload: SignupPayload;
  try {
    payload = (await request.json()) as SignupPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  const inviteToken = typeof payload.inviteToken === "string" ? payload.inviteToken.trim() : "";

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Invalid email or password.", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use.", code: "EMAIL_IN_USE" }, { status: 409 });
  }

  const userCount = await prisma.user.count();
  const isFirstUserBootstrap = userCount === 0;

  if (isFirstUserBootstrap) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: "admin",
        isActive: true,
      },
      select: { id: true, email: true, role: true },
    });
    await createSession(user.id);
    return NextResponse.json({ user, bootstrapAdmin: true }, { status: 201 });
  }

  if (inviteToken) {
    const tokenHash = hashInviteToken(inviteToken);
    const invite = await prisma.animationInvite.findUnique({
      where: { tokenHash },
    });

    const now = new Date();
    if (
      !invite ||
      invite.revokedAt !== null ||
      invite.usedAt !== null ||
      invite.expiresAt <= now
    ) {
      return NextResponse.json(
        { error: "Invite expired or invalid.", code: "INVITE_INVALID" },
        { status: 400 }
      );
    }

    if (invite.email && invite.email.trim().toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Email does not match this invite.", code: "INVITE_EMAIL_MISMATCH" },
        { status: 400 }
      );
    }

    const assignedRole = normalizeInviteRole(invite.role);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          role: assignedRole,
          isActive: true,
          invitedById: invite.createdByUserId,
        },
        select: { id: true, email: true, role: true },
      });

      await tx.animationInvite.update({
        where: { id: invite.id },
        data: {
          usedAt: now,
          usedByUserId: created.id,
        },
      });

      return created;
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: "user",
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });
  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}
