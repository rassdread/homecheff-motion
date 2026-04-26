import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUserRole, requireAdmin } from "@/server/auth/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  role?: string;
  isActive?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const admin = gate;
  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const data: { role?: string; isActive?: boolean } = {};
  if (typeof body.role === "string") {
    data.role = normalizeUserRole(body.role);
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  if (target.id === admin.id && data.isActive === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }
  if (target.id === admin.id && data.role && data.role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, isActive: true, updatedAt: true },
  });

  return NextResponse.json({ user: updated }, { status: 200 });
}
