/**
 * S2B.2 — Clothing region mask generation + validation for identity-preserving outfit edits.
 * Reuses SAM3 text segmentation. Does not run segmentation for non-clothing flows.
 */

import { segmentByPrompt } from "@/server/editor/editor-segmentation-provider";
import {
  EDITOR_SEGMENT_MASK_FETCH_TIMEOUT_MS,
  fetchWithEditorSegmentTimeout,
} from "@/lib/editor-segment-fetch";
import type { ClothingMaskStatus } from "@/types/studio-image-transformation";
import sharp from "sharp";

export type ClothingRegionMaskResult =
  | {
      ok: true;
      maskBuffer: Buffer;
      maskStorageKey: string | null;
      maskUrl: string | null;
      status: ClothingMaskStatus;
      coverageRatio: number;
      confidence: number;
      providerUsed: string;
    }
  | {
      ok: false;
      status: ClothingMaskStatus;
      reason: string;
      providerAttempted?: string;
    };

const MIN_COVERAGE = 0.03;
const MAX_COVERAGE = 0.72;

async function fetchMaskBuffer(maskUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetchWithEditorSegmentTimeout(maskUrl, EDITOR_SEGMENT_MASK_FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function maskCoverageRatio(maskBuffer: Buffer): Promise<number> {
  const { data, info } = await sharp(maskBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const alphaIdx = channels - 1;
  let masked = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += channels) {
    const alpha = data[i + alphaIdx] ?? 0;
    if (alpha > 24) {
      masked += 1;
    }
  }
  return total > 0 ? masked / total : 0;
}

/** Remove head/face alpha from clothing mask so face pixels stay protected. */
export async function excludeHeadFromClothingMask(
  clothingMask: Buffer,
  headMask: Buffer
): Promise<Buffer> {
  const clothing = await sharp(clothingMask).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const head = await sharp(headMask)
    .resize(clothing.info.width, clothing.info.height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = clothing.info.channels;
  const alphaIdx = channels - 1;
  const out = Buffer.from(clothing.data);
  for (let i = 0; i < out.length; i += channels) {
    const headAlpha = head.data[i + alphaIdx] ?? 0;
    if (headAlpha > 24) {
      out[i + alphaIdx] = 0;
    }
  }
  return sharp(out, {
    raw: { width: clothing.info.width, height: clothing.info.height, channels },
  })
    .png()
    .toBuffer();
}

export function classifyClothingMaskCoverage(coverageRatio: number, confidence: number): ClothingMaskStatus {
  if (coverageRatio < MIN_COVERAGE) {
    return "MASK_INVALID";
  }
  if (coverageRatio > MAX_COVERAGE) {
    return "MASK_INVALID";
  }
  if (confidence < 0.35) {
    return "MASK_LOW_CONFIDENCE";
  }
  return "MASK_VALID";
}

export async function generateClothingRegionMask(input: {
  userId: string;
  sessionId: string;
  imageUrl: string;
  /** Reuse an existing valid mask URL when supplied (e.g. user or prior segmentation). */
  existingMaskUrl?: string | null;
}): Promise<ClothingRegionMaskResult> {
  if (input.existingMaskUrl?.trim()) {
    const existing = await fetchMaskBuffer(input.existingMaskUrl.trim());
    if (existing) {
      const coverageRatio = await maskCoverageRatio(existing);
      const status = classifyClothingMaskCoverage(coverageRatio, 0.9);
      if (status === "MASK_VALID" || status === "MASK_LOW_CONFIDENCE") {
        return {
          ok: true,
          maskBuffer: existing,
          maskStorageKey: null,
          maskUrl: input.existingMaskUrl.trim(),
          status,
          coverageRatio,
          confidence: 0.9,
          providerUsed: "existing_mask",
        };
      }
    }
  }

  const clothingSeg = await segmentByPrompt({
    userId: input.userId,
    imageUrl: input.imageUrl,
    prompt: "clothing",
    sessionId: input.sessionId,
    editorObjectId: "clothing_region",
    createCutout: false,
  });

  if (!clothingSeg.ok || !clothingSeg.result.maskUrl) {
    return {
      ok: false,
      status: "MASK_UNAVAILABLE",
      reason: clothingSeg.ok ? "Segmentation returned no mask." : clothingSeg.error,
      providerAttempted: clothingSeg.ok ? undefined : clothingSeg.providerAttempted,
    };
  }

  let maskBuffer = await fetchMaskBuffer(clothingSeg.result.maskUrl);
  if (!maskBuffer) {
    return {
      ok: false,
      status: "MASK_UNAVAILABLE",
      reason: "Could not load clothing mask.",
      providerAttempted: clothingSeg.result.providerUsed,
    };
  }

  const headSeg = await segmentByPrompt({
    userId: input.userId,
    imageUrl: input.imageUrl,
    prompt: "head",
    sessionId: input.sessionId,
    editorObjectId: "head_protect",
    createCutout: false,
  });
  if (headSeg.ok && headSeg.result.maskUrl) {
    const headBuffer = await fetchMaskBuffer(headSeg.result.maskUrl);
    if (headBuffer) {
      maskBuffer = await excludeHeadFromClothingMask(maskBuffer, headBuffer);
    }
  }

  const coverageRatio = await maskCoverageRatio(maskBuffer);
  const confidence = clothingSeg.result.confidence ?? 0.5;
  const status = classifyClothingMaskCoverage(coverageRatio, confidence);

  if (status === "MASK_INVALID") {
    return {
      ok: false,
      status,
      reason:
        coverageRatio < MIN_COVERAGE
          ? "Clothing mask too small."
          : "Clothing mask covers too much of the image.",
      providerAttempted: clothingSeg.result.providerUsed,
    };
  }

  return {
    ok: true,
    maskBuffer,
    maskStorageKey: clothingSeg.result.maskStorageKey ?? null,
    maskUrl: clothingSeg.result.maskUrl,
    status,
    coverageRatio,
    confidence,
    providerUsed: clothingSeg.result.providerUsed,
  };
}
