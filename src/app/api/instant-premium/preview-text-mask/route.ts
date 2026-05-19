import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { parseBakedTextMaskRegion } from "@/lib/baked-text-protection";
import { requireAdmin } from "@/server/auth/permissions";
import { maskBakedTextRegionsInImageBuffer } from "@/server/instant-premium/mask-baked-text-image";

/** Admin-only debug: preview multi-region text mask before Vidu. */
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (user instanceof NextResponse) {
    return user;
  }

  const body = (await request.json().catch(() => ({}))) as {
    imageUrl?: string;
    regions?: unknown[];
  };
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  const regions = Array.isArray(body.regions)
    ? body.regions.map(parseBakedTextMaskRegion).filter((r): r is NonNullable<typeof r> => Boolean(r))
    : [];
  if (regions.length === 0) {
    return NextResponse.json({ error: "At least one mask region is required." }, { status: 400 });
  }

  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch image (${res.status}).` }, { status: 400 });
    }
    const sourceBuffer = Buffer.from(await res.arrayBuffer());
    const masked = await maskBakedTextRegionsInImageBuffer(sourceBuffer, regions);
    const blob = await put(`motion/debug/mask-preview-${Date.now()}.jpg`, masked, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
    return NextResponse.json({ previewUrl: blob.url, regionCount: regions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mask preview failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
