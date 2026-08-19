import { NextResponse } from "next/server";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";
import {
  PX4A_ITEM_COOKIE,
  PX4A_ITEM_CREATOR_PATH,
  PX4A_ITEM_TTL_SEC,
  isItemHandoffTokenSizeOk,
} from "@/lib/photo-video/item-handoff";
import {
  createItemHandoffPayload,
  signItemHandoffPayload,
  studioItemHandoffSecrets,
} from "@/lib/photo-video/item-handoff-crypto";
import { prisma } from "@/lib/prisma";
import { fetchHomecheffOwnerSourceContext } from "@/lib/studio-px4-homecheff-fetch";
import {
  isPx4OpaqueId,
  isPx4SourceType,
  studioPx4CanonicalPath,
} from "@/lib/studio-px4-source-context";
import { getAuthenticatedUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ type: string; id: string }> };

/**
 * PX.4 + Slice 1A — mint item-handoff cookie from owned listing photos,
 * then redirect to the certified from-item composer.
 */
export async function GET(_req: Request, { params }: Props) {
  const { type: rawType, id: rawId } = await params;
  const type = rawType.trim().toLowerCase();
  const id = rawId.trim();
  const returnTo = studioPx4CanonicalPath(isPx4SourceType(type) ? type : "product", id);

  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate(returnTo);
  }

  if (!user || !isPx4SourceType(type) || !isPx4OpaqueId(id)) {
    return NextResponse.redirect(new URL("/studio/photo-video", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const linked = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true },
  });
  const centralUserId = linked?.centralUserId?.trim() ?? "";
  if (!centralUserId) {
    return NextResponse.redirect(new URL("/studio/photo-video", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const result = await fetchHomecheffOwnerSourceContext({
    centralUserId,
    sourceType: type,
    sourceId: id,
  });

  if (!result.ok || result.context.media.length === 0) {
    return NextResponse.redirect(new URL("/studio/photo-video", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const secrets = studioItemHandoffSecrets();
  const secret = secrets[0];
  if (!secret) {
    return NextResponse.redirect(new URL("/studio/photo-video", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const payload = createItemHandoffPayload({
    centralUserId,
    photoUrls: result.context.media.map((m) => m.url),
  });
  if (!payload) {
    return NextResponse.redirect(new URL("/studio/photo-video", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const token = signItemHandoffPayload(payload, secret);
  if (!isItemHandoffTokenSizeOk(token)) {
    return NextResponse.redirect(new URL("/studio/photo-video", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ?? "http://localhost:3000";
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
