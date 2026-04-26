import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/public-origin";
import { generateInviteRawToken, hashInviteToken } from "@/server/auth/invite-token";
import { normalizeInviteRole, requireAdmin } from "@/server/auth/permissions";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const invites = await prisma.animationInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      createdAt: true,
      createdByUserId: true,
    },
  });

  const now = new Date();
  const enriched = invites.map((inv) => {
    let status: "active" | "used" | "expired" | "revoked";
    if (inv.revokedAt) {
      status = "revoked";
    } else if (inv.usedAt) {
      status = "used";
    } else if (inv.expiresAt <= now) {
      status = "expired";
    } else {
      status = "active";
    }
    return { ...inv, status };
  });

  return NextResponse.json({ invites: enriched }, { status: 200 });
}

type CreateBody = {
  email?: string | null;
  role?: string;
  expiresInDays?: number;
};

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const admin = gate;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const role = normalizeInviteRole(typeof body.role === "string" ? body.role : "user");
  const email =
    typeof body.email === "string" && body.email.trim() !== ""
      ? body.email.trim().toLowerCase()
      : null;
  const days =
    typeof body.expiresInDays === "number" && Number.isFinite(body.expiresInDays)
      ? Math.min(90, Math.max(1, Math.floor(body.expiresInDays)))
      : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const rawToken = generateInviteRawToken();
  const tokenHash = hashInviteToken(rawToken);

  const invite = await prisma.animationInvite.create({
    data: {
      email,
      tokenHash,
      role,
      expiresAt,
      createdByUserId: admin.id,
    },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });

  const origin = getPublicOrigin();
  const inviteUrl = `${origin}/signup?invite=${encodeURIComponent(rawToken)}`;

  return NextResponse.json(
    {
      invite,
      inviteUrl,
      message: "Store this link securely; the raw token cannot be retrieved again.",
    },
    { status: 201 }
  );
}
