import { NextResponse } from "next/server";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";

export async function GET() {
  return NextResponse.json({ mode: getInstantPremiumMode() }, { status: 200 });
}
