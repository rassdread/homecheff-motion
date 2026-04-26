import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { createSession, verifyPassword } from "@/server/auth/session";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });
  } catch (error) {
    return apiServiceUnavailable("auth/login", error);
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  // Only block when explicitly false — avoid treating null/undefined as disabled (legacy rows / odd DB states).
  if (user.isActive === false) {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 }
    );
  }

  try {
    await createSession(user.id);
  } catch (error) {
    return apiServiceUnavailable("auth/login:createSession", error);
  }

  return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 200 });
}

