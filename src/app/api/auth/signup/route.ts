import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/server/auth/session";

type SignupPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: SignupPayload;
  try {
    payload = (await request.json()) as SignupPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
    },
    select: { id: true, email: true },
  });

  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}

