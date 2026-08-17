import { NextResponse } from "next/server";
import {
  PX4A_ITEM_COOKIE,
  PX4A_ITEM_CREATOR_PATH,
  PX4A_ITEM_TTL_SEC,
  isItemHandoffTokenSizeOk,
} from "@/lib/photo-video/item-handoff";
import { studioItemHandoffSecrets, verifyItemHandoffToken } from "@/lib/photo-video/item-handoff-crypto";

export const dynamic = "force-dynamic";

function appOrigin(req: Request): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const secrets = studioItemHandoffSecrets();
  if (secrets.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "").trim();
  const payload = token ? verifyItemHandoffToken(token, secrets) : null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid handoff" }, { status: 400 });
  }
  if (!isItemHandoffTokenSizeOk(token)) {
    return NextResponse.json({ error: "Invalid handoff" }, { status: 400 });
  }
  const origin = appOrigin(req);
  const res = NextResponse.redirect(new URL(PX4A_ITEM_CREATOR_PATH, origin), 303);
  res.cookies.set(PX4A_ITEM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PX4A_ITEM_TTL_SEC,
  });
  return res;
}
