import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";

export async function GET() {
  const user = await getAuthenticatedUser();
  return NextResponse.json({ user }, { status: 200 });
}

