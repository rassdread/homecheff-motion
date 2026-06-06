import { NextResponse } from "next/server";
import { getAppBuildInfo } from "@/lib/app-build-info";

export async function GET() {
  const info = getAppBuildInfo();
  return NextResponse.json(
    {
      ok: true,
      ...info,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
