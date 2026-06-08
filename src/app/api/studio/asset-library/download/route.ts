import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";

export async function GET(req: Request) {
  const viewer = await requireActiveUser();
  if (viewer instanceof NextResponse) {
    return viewer;
  }
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url")?.trim();
  const filename = url.searchParams.get("filename")?.trim() || "studio-asset.jpg";

  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return Response.json({ error: "Invalid url" }, { status: 400 });
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
