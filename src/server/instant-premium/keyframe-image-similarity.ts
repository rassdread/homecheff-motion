/**
 * Perceptual hash + lightweight SSIM for keyframe pair similarity.
 */

import {
  combinePixelSimilarity,
  type KeyframePairInput,
  type KeyframePairScore,
  resolveFrameContinuityMode,
  scoreKeyframePairQuick,
} from "@/lib/exact-frame-continuity";

const HASH_SIZE = 8;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!res.ok) {
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Average hash on 8×8 grayscale grid → 64-bit string. */
export async function averageHashBits(buffer: Buffer): Promise<string | null> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(buffer)
    .resize(HASH_SIZE, HASH_SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!data.length || info.width !== HASH_SIZE || info.height !== HASH_SIZE) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += data[i] ?? 0;
  }
  const avg = sum / data.length;
  let bits = "";
  for (let i = 0; i < data.length; i += 1) {
    bits += (data[i] ?? 0) >= avg ? "1" : "0";
  }
  return bits;
}

export function hammingSimilarity(bitsA: string, bitsB: string): number {
  if (bitsA.length !== bitsB.length || bitsA.length === 0) {
    return 0;
  }
  let dist = 0;
  for (let i = 0; i < bitsA.length; i += 1) {
    if (bitsA[i] !== bitsB[i]) {
      dist += 1;
    }
  }
  return 1 - dist / bitsA.length;
}

/** Mean luminance 0–1 for exposure delta. */
export async function meanLuminance(buffer: Buffer): Promise<number | null> {
  const sharp = (await import("sharp")).default;
  const { data } = await sharp(buffer)
    .resize(64, 64, { fit: "inside" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!data.length) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += data[i] ?? 0;
  }
  return sum / data.length / 255;
}

/** Simplified SSIM on small grayscale thumbnails. */
export async function simplifiedSsim(bufferA: Buffer, bufferB: Buffer): Promise<number> {
  const sharp = (await import("sharp")).default;
  const size = 64;
  const [a, b] = await Promise.all([
    sharp(bufferA).resize(size, size, { fit: "fill" }).grayscale().raw().toBuffer(),
    sharp(bufferB).resize(size, size, { fit: "fill" }).grayscale().raw().toBuffer(),
  ]);
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  const n = a.length;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i += 1) {
    meanA += a[i] ?? 0;
    meanB += b[i] ?? 0;
  }
  meanA /= n;
  meanB /= n;
  let varA = 0;
  let varB = 0;
  let cov = 0;
  for (let i = 0; i < n; i += 1) {
    const da = (a[i] ?? 0) - meanA;
    const db = (b[i] ?? 0) - meanB;
    varA += da * da;
    varB += db * db;
    cov += da * db;
  }
  varA /= n;
  varB /= n;
  cov /= n;
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const ssim =
    ((2 * meanA * meanB + c1) * (2 * cov + c2)) / ((meanA ** 2 + meanB ** 2 + c1) * (varA + varB + c2));
  return Math.max(0, Math.min(1, ssim));
}

export async function scoreKeyframePairWithPixels(input: KeyframePairInput): Promise<KeyframePairScore> {
  const quick = scoreKeyframePairQuick(input);
  if (quick.similarity >= 1) {
    return quick;
  }

  const endUrl = input.endPreviewUrl?.trim();
  const startUrl = input.startPreviewUrl?.trim();
  if (!endUrl || !startUrl) {
    return { ...quick, similarity: 0, mode: "normal", reason: "missing_preview_url" };
  }

  const [endBuf, startBuf] = await Promise.all([
    fetchImageBuffer(endUrl),
    fetchImageBuffer(startUrl),
  ]);
  if (!endBuf || !startBuf) {
    return { ...quick, similarity: 0, mode: "normal", reason: "fetch_failed" };
  }

  const [hashEnd, hashStart, lumEnd, lumStart, ssim] = await Promise.all([
    averageHashBits(endBuf),
    averageHashBits(startBuf),
    meanLuminance(endBuf),
    meanLuminance(startBuf),
    simplifiedSsim(endBuf, startBuf),
  ]);

  const phashSimilarity =
    hashEnd && hashStart ? hammingSimilarity(hashEnd, hashStart) : 0;
  const similarity = combinePixelSimilarity(phashSimilarity, ssim);
  const exposureDelta =
    lumEnd != null && lumStart != null ? Math.abs(lumEnd - lumStart) : undefined;

  return {
    similarity,
    mode: resolveFrameContinuityMode(similarity),
    reason: "phash_ssim",
    phashSimilarity,
    ssimScore: ssim,
    exposureDelta,
  };
}
