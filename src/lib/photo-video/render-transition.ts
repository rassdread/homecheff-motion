/**
 * Canonical transition compositor. Preview and export call this after each
 * photo has already been motion-transformed into a layer canvas.
 * Falls back to fade if a signature clip throws.
 */

import { sampleTransition, type TransitionClip } from "@/lib/photo-video/transition-geometry";
import type { PhotoVideoResolvedTransition } from "@/lib/photo-video/transition-kind";

export function applyTransitionClip(ctx: CanvasRenderingContext2D, clip: TransitionClip): void {
  if (clip.type === "none") return;
  ctx.beginPath();
  if (clip.type === "rect") {
    ctx.rect(clip.rect.x, clip.rect.y, clip.rect.w, clip.rect.h);
  } else if (clip.type === "circle") {
    ctx.arc(clip.cx, clip.cy, Math.max(0, clip.r), 0, Math.PI * 2);
  } else if (clip.type === "pie") {
    ctx.moveTo(clip.cx, clip.cy);
    ctx.arc(clip.cx, clip.cy, Math.max(0, clip.r), clip.start, clip.end, false);
    ctx.closePath();
  } else if (clip.type === "polygons") {
    for (const poly of clip.polygons) {
      if (!poly[0]) continue;
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i]!.x, poly[i]!.y);
      ctx.closePath();
    }
  } else {
    const pts = clip.points;
    if (!pts[0]) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.closePath();
  }
  ctx.clip();
}

function paintLayer(
  ctx: CanvasRenderingContext2D,
  layer: CanvasImageSource,
  clip: TransitionClip,
  alpha: number,
  offsetX: number,
  scale: number,
  rotate: number,
  width: number,
  height: number
) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (clip.type !== "none") applyTransitionClip(ctx, clip);
  if (offsetX || scale !== 1 || rotate) {
    ctx.translate(width / 2 + offsetX, height / 2);
    ctx.rotate(rotate);
    ctx.scale(scale, scale);
    ctx.drawImage(layer, -width / 2, -height / 2, width, height);
  } else {
    ctx.drawImage(layer, 0, 0, width, height);
  }
  ctx.restore();
}

function fade(
  ctx: CanvasRenderingContext2D,
  outgoing: CanvasImageSource,
  incoming: CanvasImageSource,
  mix: number,
  width: number,
  height: number
) {
  ctx.drawImage(outgoing, 0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, mix));
  ctx.drawImage(incoming, 0, 0, width, height);
  ctx.restore();
}

export function renderTransitionFrame(input: {
  ctx: CanvasRenderingContext2D;
  outgoing: CanvasImageSource;
  incoming: CanvasImageSource;
  mix: number;
  kind: PhotoVideoResolvedTransition;
  width: number;
  height: number;
  seed: number;
}) {
  const mix = Math.max(0, Math.min(1, input.mix));
  const { ctx, outgoing, incoming, width, height, seed } = input;
  try {
    if (input.kind === "cut") {
      ctx.drawImage(mix >= 1 ? incoming : outgoing, 0, 0, width, height);
      return sampleTransition(input.kind, mix, width, height, seed);
    }
    const sample = sampleTransition(input.kind, mix, width, height, seed);
    if (input.kind === "fade") {
      fade(ctx, outgoing, incoming, mix, width, height);
      return sample;
    }
    if (input.kind === "hc_shards") {
      ctx.drawImage(incoming, 0, 0, width, height);
      paintLayer(
        ctx,
        outgoing,
        sample.outgoingClip,
        sample.outgoingAlpha,
        sample.outgoingOffsetX,
        sample.outgoingScale,
        sample.outgoingRotate,
        width,
        height
      );
      return sample;
    }
    if (input.kind === "hc_split") {
      ctx.drawImage(incoming, 0, 0, width, height);
      const shift = sample.outgoingOffsetX;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width / 2, height);
      ctx.clip();
      ctx.drawImage(outgoing, -shift, 0, width, height);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(width / 2, 0, width / 2, height);
      ctx.clip();
      ctx.drawImage(outgoing, shift, 0, width, height);
      ctx.restore();
      return sample;
    }
    paintLayer(
      ctx,
      outgoing,
      sample.outgoingClip,
      sample.outgoingAlpha,
      sample.outgoingOffsetX,
      sample.outgoingScale,
      sample.outgoingRotate,
      width,
      height
    );
    paintLayer(
      ctx,
      incoming,
      sample.incomingClip,
      sample.incomingAlpha,
      sample.incomingOffsetX,
      sample.incomingScale,
      0,
      width,
      height
    );
    return sample;
  } catch {
    fade(ctx, outgoing, incoming, mix, width, height);
    return sampleTransition("fade", mix, width, height, seed);
  }
}
