import { NextResponse } from "next/server";

/** Log server-side; return safe JSON for clients (no stack traces). */
export function apiServiceUnavailable(route: string, error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[api:${route}]`, message, error);
  return NextResponse.json(
    {
      error: "Service temporarily unavailable.",
      code: "SERVICE_UNAVAILABLE",
    },
    { status: 503 }
  );
}
