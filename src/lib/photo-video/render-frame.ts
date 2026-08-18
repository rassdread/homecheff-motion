/**
 * Canonical PX.4A frame painter. Preview and local export share this path
 * so timing, motion, text, transitions, and watermark cannot drift.
 */

import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { compositionDuration, isCompositionPreviewReady, overlaysForPhoto } from "@/lib/photo-video/composition";
import { activePhotoIdAt } from "@/lib/photo-video/clock";
import type { PhotoVideoContext } from "@/lib/photo-video/constants";
import { coverFitRect, safeZones } from "@/lib/photo-video/layout";
import { sampleLocalMotion } from "@/lib/photo-video/motion";
import { renderTransitionFrame } from "@/lib/photo-video/render-transition";
import { styleRecipe } from "@/lib/photo-video/styles";
import { hashTransitionSeed } from "@/lib/photo-video/transition-kind";
import { motionKindForClip, playheadAt } from "@/lib/photo-video/timeline";
import {
  canvasFontShorthand,
  fontSizePx,
  overlayVisibleForPhoto,
  type OverlayBox,
  type PhotoVideoTextOverlay,
} from "@/lib/photo-video/text-overlay";

export type PhotoVideoImageCache = Map<string, HTMLImageElement>;
export type OverlayLayout = { id: string } & OverlayBox;

let layerPair: { width: number; height: number; a: HTMLCanvasElement; b: HTMLCanvasElement } | null = null;

function acquireLayers(width: number, height: number): { a: HTMLCanvasElement; b: HTMLCanvasElement } | null {
  if (typeof document === "undefined") return null;
  if (!layerPair || layerPair.width !== width || layerPair.height !== height) {
    const a = document.createElement("canvas");
    const b = document.createElement("canvas");
    a.width = width;
    a.height = height;
    b.width = width;
    b.height = height;
    layerPair = { width, height, a, b };
  }
  return layerPair;
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  zoom: number,
  panX: number,
  panY: number,
  alpha: number
) {
  const rect = coverFitRect({
    imageWidth: image.naturalWidth || image.width,
    imageHeight: image.naturalHeight || image.height,
    canvasWidth: canvasW,
    canvasHeight: canvasH,
    zoom,
    panX,
    panY,
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0]!;
  for (const word of words.slice(1)) {
    const trial = `${current} ${word}`;
    if (ctx.measureText(trial).width <= maxWidth) current = trial;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines.slice(0, 3);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.rect(x, y, w, h);
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: PhotoVideoTextOverlay,
  canvasW: number,
  canvasH: number,
  selected: boolean,
  placeholder: string
): OverlayLayout {
  const minEdge = Math.min(canvasW, canvasH);
  const fontPx = fontSizePx(overlay.size, minEdge);
  ctx.save();
  ctx.font = canvasFontShorthand(overlay.font, fontPx);
  ctx.textAlign = overlay.align;
  ctx.textBaseline = "middle";
  const source = overlay.text.trim() ? overlay.text : placeholder;
  const lines = wrapText(ctx, source, canvasW * 0.78);
  const display = lines.length ? lines : [placeholder];
  const lineH = fontPx * 1.2;
  const textW = Math.max(...display.map((line) => ctx.measureText(line).width), fontPx * 1.2);
  const textH = display.length * lineH;
  const padX = overlay.background === "none" ? fontPx * 0.12 : fontPx * 0.38;
  const padY = overlay.background === "none" ? fontPx * 0.08 : fontPx * 0.22;
  const boxW = textW + padX * 2;
  const boxH = textH + padY * 2;
  const cx = overlay.x * canvasW;
  const cy = overlay.y * canvasH;
  let left = cx - boxW / 2;
  if (overlay.align === "left") left = cx - padX;
  if (overlay.align === "right") left = cx - boxW + padX;
  const top = cy - boxH / 2;

  if (overlay.background !== "none") {
    ctx.fillStyle = overlay.background === "dark" ? "rgba(4, 20, 40, 0.55)" : "rgba(255, 255, 255, 0.78)";
    roundRectPath(ctx, left, top, boxW, boxH, fontPx * 0.28);
    ctx.fill();
  }

  ctx.shadowColor = overlay.color === "#FFFFFF" || overlay.background === "light" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = overlay.text.trim() ? overlay.color : "rgba(255,255,255,0.7)";
  display.forEach((line, i) => {
    const ly = top + padY + lineH * i + lineH / 2;
    ctx.fillText(line, cx, ly, canvasW * 0.78);
  });
  ctx.shadowBlur = 0;
  if (selected) {
    ctx.strokeStyle = "#006D52";
    ctx.lineWidth = Math.max(2, minEdge * 0.006);
    roundRectPath(ctx, left - 3, top - 3, boxW + 6, boxH + 6, fontPx * 0.3);
    ctx.stroke();
  }
  ctx.restore();
  return { id: overlay.id, x: left - 4, y: top - 4, width: boxW + 8, height: boxH + 8 };
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  mark: HTMLImageElement,
  zone: { x: number; y: number; size: number; width: number }
) {
  ctx.save();
  const r = Math.max(8, zone.size * 0.22);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(zone.x, zone.y, zone.width, zone.size, r);
  } else {
    ctx.rect(zone.x, zone.y, zone.width, zone.size);
  }
  ctx.fillStyle = "rgba(4, 20, 40, 0.48)";
  ctx.fill();
  const inset = zone.size * 0.14;
  const globe = zone.size - inset * 2;
  ctx.drawImage(mark, zone.x + inset, zone.y + inset, globe, globe);
  const textX = zone.x + inset + globe + zone.size * 0.12;
  const textY = zone.y + zone.size * 0.62;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${Math.max(9, zone.size * 0.28)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("HomeCheff Studio", textX, textY, zone.width - globe - inset * 3);
  ctx.restore();
}

export function loadPhotoVideoImage(src: string, cache: PhotoVideoImageCache): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit?.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export function drawPhotoVideoFrame(input: {
  ctx: CanvasRenderingContext2D;
  composition: PhotoVideoComposition;
  context?: PhotoVideoContext;
  timeSeconds: number;
  images: PhotoVideoImageCache;
  watermark: HTMLImageElement | null;
  selectedOverlayId?: string | null;
  placeholderText: string;
  drawSelection?: boolean;
}): OverlayLayout[] {
  const context = input.context ?? "studio";
  const w = input.ctx.canvas.width;
  const h = input.ctx.canvas.height;
  input.ctx.fillStyle = "#041428";
  input.ctx.fillRect(0, 0, w, h);
  const layouts: OverlayLayout[] = [];
  if (!isCompositionPreviewReady(input.composition, context)) {
    input.ctx.fillStyle = "rgba(255,255,255,0.35)";
    input.ctx.fillRect(0, 0, w, h);
    return layouts;
  }
  void compositionDuration(input.composition, context);
  const head = playheadAt(input.composition, input.timeSeconds, context);
  const recipe = styleRecipe(input.composition.style);
  const transitioning = Boolean(head.from && head.to && head.mix > 0);
  const paintClip = (
    target: CanvasRenderingContext2D,
    clip: NonNullable<typeof head.from>,
    progress: number,
    alpha: number,
    withText: boolean
  ) => {
    const image = input.images.get(clip.photo.previewUrl);
    if (!image) return;
    const motion = sampleLocalMotion(motionKindForClip(input.composition, clip), progress, recipe.motionStrength);
    drawCoverImage(target, image, w, h, motion.zoom, motion.panX, motion.panY, alpha);
    if (!withText) return;
    for (const overlay of overlaysForPhoto(input.composition, clip.photo.id)) {
      drawOverlay(target, overlay, w, h, false, input.placeholderText);
    }
  };

  if (transitioning && head.from && head.to) {
    const layers = acquireLayers(w, h);
    const ctxA = layers?.a.getContext("2d") ?? null;
    const ctxB = layers?.b.getContext("2d") ?? null;
    if (layers && ctxA && ctxB) {
      for (const layerCtx of [ctxA, ctxB]) {
        layerCtx.fillStyle = "#041428";
        layerCtx.fillRect(0, 0, w, h);
      }
      paintClip(ctxA, head.from, head.fromProgress, 1, true);
      paintClip(ctxB, head.to, head.toProgress, 1, true);
      renderTransitionFrame({
        ctx: input.ctx,
        outgoing: layers.a,
        incoming: layers.b,
        mix: head.mix,
        kind: head.transition,
        width: w,
        height: h,
        seed: hashTransitionSeed(head.from.photo.id, head.to.photo.id, String(head.from.index)),
      });
    } else {
      paintClip(input.ctx, head.from, head.fromProgress, 1, true);
      paintClip(input.ctx, head.to, head.toProgress, head.mix, true);
    }
  } else if (head.from) {
    paintClip(input.ctx, head.from, head.fromProgress, 1, false);
  }

  const activePhotoId = activePhotoIdAt(input.composition, input.timeSeconds, context);
  for (const overlay of input.composition.overlays) {
    if (!overlayVisibleForPhoto(overlay, activePhotoId)) continue;
    if (transitioning) continue;
    layouts.push(
      drawOverlay(
        input.ctx,
        overlay,
        w,
        h,
        Boolean(input.drawSelection && overlay.id === input.selectedOverlayId),
        input.placeholderText
      )
    );
  }
  const zones = safeZones({ width: w, height: h });
  if (input.watermark) drawWatermark(input.ctx, input.watermark, zones.watermark);
  return layouts;
}
