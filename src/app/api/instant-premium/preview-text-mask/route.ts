import { NextResponse } from "next/server";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import { buildViduMaskRegionsFromBlocks } from "@/lib/instant-text-mask-regions";
import {
  normalizeTextRenderMode,
  usesAggressivePreAiNeutralize,
  usesHybridPreAiNeutralize,
} from "@/lib/hybrid-motion-overlay";
import { parseBakedTextMaskRegion } from "@/lib/baked-text-protection";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
import { maskBakedTextRegionsInImageBuffer } from "@/server/instant-premium/mask-baked-text-image";

/** Admin-only debug: preview aggressive text/UI removal before Vidu. */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const devPreview =
    getInstantPremiumMode() === "test" || process.env.NODE_ENV === "development";
  if (!canAccessAdmin(user) && !devPreview) {
    return NextResponse.json({ error: "Forbidden.", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    imageUrl?: string;
    regions?: unknown[];
    blocks?: unknown[];
    textRenderMode?: string;
  };
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  const textRenderMode = normalizeTextRenderMode(body.textRenderMode);
  const aggressive = usesAggressivePreAiNeutralize(textRenderMode);
  const useHybridNeutralize = usesHybridPreAiNeutralize(textRenderMode);

  const blockRecords = parseBakedTextBlockRecords(body.blocks).filter(
    (b) => b.kept !== false && b.editedText.trim().length > 0
  );

  let maskRegions = Array.isArray(body.regions)
    ? body.regions.map(parseBakedTextMaskRegion).filter((r): r is NonNullable<typeof r> => Boolean(r))
    : [];

  const rawBlockRegions: BakedTextBlockRecord["bbox"][] =
    blockRecords.length > 0 ? blockRecords.map((b) => b.bbox) : [];

  if (blockRecords.length > 0) {
    maskRegions = buildViduMaskRegionsFromBlocks(blockRecords, aggressive);
  }

  if (maskRegions.length === 0) {
    return NextResponse.json({ error: "At least one mask region or block is required." }, { status: 400 });
  }

  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch image (${res.status}).` }, { status: 400 });
    }
    const sourceBuffer = Buffer.from(await res.arrayBuffer());
    const { buffer: masked, skippedRegionCount } = await maskBakedTextRegionsInImageBuffer(
      sourceBuffer,
      maskRegions,
      {
        useHybridNeutralize,
        useAggressiveNeutralize: aggressive,
      }
    );
    const uploadTarget = `motion/debug/mask-preview-${Date.now()}.jpg`;
    const { url } = await uploadPublicBlob({
      pathname: uploadTarget,
      body: masked,
      contentType: "image/jpeg",
      addRandomSuffix: true,
      context: { uploadTarget, provider: "instant-mask-preview" },
    });
    return NextResponse.json({
      originalUrl: imageUrl,
      cleanedUrl: url,
      previewUrl: url,
      maskRegions,
      rawBlockRegions,
      regionCount: maskRegions.length,
      skippedRegionCount,
      textRenderMode,
      aggressive,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mask preview failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
