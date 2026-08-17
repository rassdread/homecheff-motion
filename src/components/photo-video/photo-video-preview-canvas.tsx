"use client";

import { useEffect, useRef } from "react";
import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { includedPhotos, isCompositionPreviewReady } from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_WATERMARK_SRC } from "@/lib/photo-video/constants";
import { canvasSizeForRatio, coverFitRect, safeZones } from "@/lib/photo-video/layout";
import { sampleLocalMotion } from "@/lib/photo-video/motion";
import { styleRecipe } from "@/lib/photo-video/styles";
import { motionKindForClip, playheadAt } from "@/lib/photo-video/timeline";

type ImageCache = Map<string, HTMLImageElement>;

function drawCoverImage(
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

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  zone: { x: number; y: number; width: number; height: number },
  fontSize: number,
  weight: number
) {
  if (!text.trim()) return;
  ctx.save();
  ctx.font = `${weight} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff";
  const lines = wrapText(ctx, text, zone.width);
  const lineH = fontSize * 1.15;
  lines.forEach((line, i) => {
    ctx.fillText(line, zone.x, zone.y + i * lineH, zone.width);
  });
  ctx.restore();
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  mark: HTMLImageElement,
  zone: { x: number; y: number; size: number }
) {
  ctx.save();
  const r = Math.max(8, zone.size * 0.18);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(zone.x, zone.y, zone.size, zone.size, r);
  } else {
    ctx.rect(zone.x, zone.y, zone.size, zone.size);
  }
  ctx.fillStyle = "rgba(4, 20, 40, 0.42)";
  ctx.fill();
  const inset = zone.size * 0.12;
  ctx.drawImage(mark, zone.x + inset, zone.y + inset, zone.size - inset * 2, zone.size - inset * 2);
  ctx.restore();
}

function loadImage(src: string, cache: ImageCache): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit?.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export function PhotoVideoPreviewCanvas({
  composition,
  playing,
}: {
  composition: PhotoVideoComposition;
  playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<ImageCache>(new Map());
  const watermarkRef = useRef<HTMLImageElement | null>(null);
  const compositionRef = useRef(composition);
  const playingRef = useRef(playing);
  const clockRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const size = canvasSizeForRatio(composition.ratio);

  useEffect(() => {
    compositionRef.current = composition;
    playingRef.current = playing;
  }, [composition, playing]);

  useEffect(() => {
    clockRef.current = 0;
  }, [composition.photos, composition.pace, composition.style, composition.endCardSeconds]);

  useEffect(() => {
    const cache = cacheRef.current;
    const urls = includedPhotos(composition).map((photo) => photo.previewUrl);
    void Promise.all(urls.map((url) => loadImage(url, cache).catch(() => null)));
  }, [composition]);

  useEffect(() => {
    let cancelled = false;
    void loadImage(PHOTO_VIDEO_WATERMARK_SRC, cacheRef.current)
      .then((img) => {
        if (!cancelled) watermarkRef.current = img;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const paint = (ts: number) => {
      const current = compositionRef.current;
      if (playingRef.current && isCompositionPreviewReady(current)) {
        const last = lastTsRef.current;
        if (last != null) {
          clockRef.current += (ts - last) / 1000;
        }
      }
      lastTsRef.current = ts;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#041428";
      ctx.fillRect(0, 0, w, h);
      if (!isCompositionPreviewReady(current)) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(0, 0, w, h);
      } else {
        const head = playheadAt(current, clockRef.current);
        const recipe = styleRecipe(current.style);
        const paintClip = (
          clip: NonNullable<typeof head.from>,
          progress: number,
          alpha: number
        ) => {
          const image = cacheRef.current.get(clip.photo.previewUrl);
          if (!image) return;
          const motion = sampleLocalMotion(
            motionKindForClip(current, clip),
            progress,
            recipe.motionStrength
          );
          drawCoverImage(ctx, image, w, h, motion.zoom, motion.panX, motion.panY, alpha);
        };
        if (head.from) paintClip(head.from, head.fromProgress, 1);
        if (head.to && head.mix > 0) paintClip(head.to, head.toProgress, head.mix);
        const zones = safeZones({ width: w, height: h });
        drawTextBlock(ctx, current.title, zones.title, Math.round(w * 0.07), 700);
        drawTextBlock(ctx, current.extraText, zones.extra, Math.round(w * 0.045), 500);
        if (watermarkRef.current) drawWatermark(ctx, watermarkRef.current, zones.watermark);
      }
      raf = window.requestAnimationFrame(paint);
    };
    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [size.height, size.width]);

  return (
    <canvas
      ref={canvasRef}
      width={size.width}
      height={size.height}
      data-testid="px4a-preview-canvas"
      className="mx-auto h-auto max-h-[min(70vh,640px)] w-auto max-w-full rounded-2xl bg-[#041428] shadow-lg"
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    />
  );
}
