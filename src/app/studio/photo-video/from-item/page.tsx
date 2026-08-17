import { cookies } from "next/headers";
import { PhotoVideoFromItemClient } from "@/app/studio/photo-video/from-item/from-item-client";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";
import {
  PX4A_ITEM_COOKIE,
  PX4A_ITEM_CREATOR_PATH,
  boundListingPhotoUrls,
  itemReturnHref,
} from "@/lib/photo-video/item-handoff";
import { studioItemHandoffSecrets, verifyItemHandoffToken } from "@/lib/photo-video/item-handoff-crypto";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/server/auth/session";

function homecheffReturnOrigin(): string {
  const env =
    process.env.HOMECHEFF_IDENTITY_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_HOMECHEFF_ORIGIN?.trim() ||
    "https://homecheff.eu";
  return env.replace(/\/$/, "");
}

export const dynamic = "force-dynamic";

export default async function StudioPhotoVideoFromItemPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate(PX4A_ITEM_CREATOR_PATH);
  }

  const jar = await cookies();
  const token = jar.get(PX4A_ITEM_COOKIE)?.value ?? "";
  const payload = token ? verifyItemHandoffToken(token, studioItemHandoffSecrets()) : null;

  const linked = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { centralUserId: true },
      })
    : null;
  const centralUserId = linked?.centralUserId?.trim() ?? "";

  const listingPhotoUrls = boundListingPhotoUrls(payload, centralUserId);
  const returnHref = itemReturnHref(homecheffReturnOrigin(), payload, centralUserId);

  return <PhotoVideoFromItemClient listingPhotoUrls={listingPhotoUrls} returnHref={returnHref} />;
}
