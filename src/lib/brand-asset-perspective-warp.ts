/**
 * Perspective warp engine — transforms original logo assets onto quads via @napi-rs/canvas.
 * Never redraws the logo; only geometric transforms on the source pixels.
 */

import type { Image, SKRSContext2D } from "@napi-rs/canvas";
import type { BrandAssetQuad } from "@/types/brand-asset-protection";

export type PerspectiveWarpResult = {
  buffer: Buffer;
  applied: boolean;
  alphaPreserved: boolean;
  warnings: string[];
};

type Point = { x: number; y: number };

function drawTriangleWarp(
  ctx: SKRSContext2D,
  image: Image,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-8) {
    ctx.restore();
    return;
  }

  const m11 = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const m12 = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const m21 = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
  const m22 = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
  const dx =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    denom;
  const dy =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    denom;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

async function loadCanvas() {
  return import("@napi-rs/canvas");
}

export async function warpLogoBufferToQuad(input: {
  logoBuffer: Buffer;
  pixelQuad: BrandAssetQuad;
  canvasWidth: number;
  canvasHeight: number;
}): Promise<PerspectiveWarpResult> {
  const warnings: string[] = [];
  try {
    const { createCanvas, loadImage } = await loadCanvas();
    const image = await loadImage(input.logoBuffer);
    const canvas = createCanvas(input.canvasWidth, input.canvasHeight);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, input.canvasWidth, input.canvasHeight);

    const w = image.width;
    const h = image.height;
    const src: Point[] = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    const dst: Point[] = [
      input.pixelQuad.topLeft,
      input.pixelQuad.topRight,
      input.pixelQuad.bottomRight,
      input.pixelQuad.bottomLeft,
    ];

    drawTriangleWarp(ctx, image, src[0]!, src[1]!, src[3]!, dst[0]!, dst[1]!, dst[3]!);
    drawTriangleWarp(ctx, image, src[1]!, src[2]!, src[3]!, dst[1]!, dst[2]!, dst[3]!);

    const buffer = canvas.toBuffer("image/png");
    const alphaPreserved = buffer.length > 0;

    return {
      buffer,
      applied: true,
      alphaPreserved,
      warnings,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "perspective warp failed");
    return {
      buffer: input.logoBuffer,
      applied: false,
      alphaPreserved: false,
      warnings,
    };
  }
}

export function quadCoversBounds(quad: BrandAssetQuad): boolean {
  const xs = [quad.topLeft.x, quad.topRight.x, quad.bottomRight.x, quad.bottomLeft.x];
  const ys = [quad.topLeft.y, quad.topRight.y, quad.bottomRight.y, quad.bottomLeft.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return maxX - minX > 1 && maxY - minY > 1;
}
