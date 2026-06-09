import { NextResponse } from "next/server";
import { isUserGeneratedStorageKey } from "@/lib/studio-asset-registry-visibility";
import { requireActiveUser } from "@/server/auth/permissions";

function isAllowedDownloadUrl(url: string, userId: string): boolean {
  if (!url.startsWith("https://")) {
    return false;
  }
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname);
    if (path.includes(`/studio/${userId}/`)) {
      return true;
    }
    if (path.includes("/generated/animations/") && path.includes(userId)) {
      return true;
    }
    if (
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
      parsed.hostname.endsWith(".blob.vercel-storage.com")
    ) {
      const keyMatch = path.match(/studio\/[^/]+\//);
      if (keyMatch) {
        const segment = path.split("/studio/")[1]?.split("/")[0];
        return segment === userId;
      }
    }
    return path.includes(`/${userId}/`) || path.includes(`users/${userId}/`);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const viewer = await requireActiveUser();
  if (viewer instanceof NextResponse) {
    return viewer;
  }
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url")?.trim();
  const storageKey = url.searchParams.get("storageKey")?.trim();
  const filename = url.searchParams.get("filename")?.trim() || "studio-asset.jpg";

  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return Response.json({ error: "Invalid url" }, { status: 400 });
  }

  const ownedByKey = storageKey ? isUserGeneratedStorageKey(storageKey, viewer.id) : false;
  const ownedByUrl = isAllowedDownloadUrl(imageUrl, viewer.id);
  if (!ownedByKey && !ownedByUrl) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: "Download failed" }, { status: 502 });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "Download failed" }, { status: 502 });
  }
}
