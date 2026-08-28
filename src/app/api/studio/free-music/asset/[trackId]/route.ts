import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { isStudioFreeMusicCatalogEnabledForUser } from "@/lib/free-music/flag";
import { resolveFreeMusicAsset } from "@/lib/free-music/resolve-asset";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Authorized Free Music audio delivery.
 * Never exposes evidence files. Requires catalog access for the user.
 * Rejects client-supplied alternate URLs — trackId is the only selector.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trackId: string }> }
) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  if (!isStudioFreeMusicCatalogEnabledForUser(user.id)) {
    return NextResponse.json({ error: "FREE_MUSIC_DISABLED" }, { status: 403 });
  }

  const { trackId } = await context.params;
  const kindRaw = request.nextUrl.searchParams.get("kind") || "preview";
  const kind = kindRaw === "master" ? "master" : "preview";

  // Client cannot pass audioUrl — ignore any such query.
  if (request.nextUrl.searchParams.has("audioUrl")) {
    return NextResponse.json({ error: "CLIENT_AUDIO_URL_FORBIDDEN" }, { status: 400 });
  }

  const resolved = await resolveFreeMusicAsset({ trackId, kind });
  if (!resolved.ok) {
    const status =
      resolved.reason === "UNKNOWN_TRACK_ID"
        ? 404
        : resolved.reason === "TRACK_SUSPENDED" || resolved.reason === "TRACK_RETIRED"
          ? 409
          : 403;
    return NextResponse.json({ error: resolved.reason }, { status });
  }

  return new NextResponse(new Uint8Array(resolved.body), {
    status: 200,
    headers: {
      "Content-Type": resolved.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "X-Free-Music-Source": resolved.source,
    },
  });
}
