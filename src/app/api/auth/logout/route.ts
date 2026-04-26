import { NextResponse } from "next/server";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { clearSession } from "@/server/auth/session";

export async function POST() {
  try {
    await clearSession();
  } catch (error) {
    return apiServiceUnavailable("auth/logout", error);
  }
  return NextResponse.json({ ok: true });
}

