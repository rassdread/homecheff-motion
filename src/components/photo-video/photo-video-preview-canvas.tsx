"use client";

import { useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { compositionDuration, includedPhotos, isCompositionPreviewReady } from "@/lib/photo-video/composition";
import { wrapCompositionTime, activePhotoIdAt } from "@/lib/photo-video/clock";
import { PHOTO_VIDEO_WATERMARK_SRC } from "@/lib/photo-video/constants";
import { canvasSizeForRatio, coverFitRect, safeZones } from "@/lib/photo-video/layout";
import { sampleLocalMotion } from "@/lib/photo-video/motion";
import { styleRecipe } from "@/lib/photo-video/styles";
import { motionKindForClip, playheadAt } from "@/lib/photo-video/timeline";
import {
  PHOTO_VIDEO_FONT_STACK,
  PHOTO_VIDEO_FONT_WEIGHT,
  clientPointToNormalized,
  fontSizePx,
  hitTestLayouts,
  overlayVisibleForPhoto,
  type OverlayBox,
  type PhotoVideoTextOverlay,
} from "@/lib/photo-video/text-overlay";

type ImageCache = Map<string, HTMLImageElement>;
type OverlayLayout = { id: string } & OverlayBox;

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

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.rect(x, y, w, h);
}

function drawOverlay(
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
  ctx.font = `${PHOTO_VIDEO_FONT_WEIGHT[overlay.font]} ${fontPx}px ${PHOTO_VIDEO_FONT_STACK[overlay.font]}`;
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
  clockRef,
  selectedOverlayId,
  placeholderText,
  onSelectOverlay,
  onMoveOverlay,
}: {
  composition: PhotoVideoComposition;
  playing: boolean;
  clockRef: MutableRefObject<number>;
  selectedOverlayId: string | null;
  placeholderText: string;
  onSelectOverlay: (id: string | null) => void;
  onMoveOverlay: (id: string, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<ImageCache>(new Map());
  const watermarkRef = useRef<HTMLImageElement | null>(null);
  const compositionRef = useRef(composition);
  const playingRef = useRef(playing);
  const lastTsRef = useRef<number | null>(null);
  const layoutsRef = useRef<OverlayLayout[]>([]);
  const dragRef = useRef<{
    id: string;
    originNx: number;
    originNy: number;
    startNx: number;
    startNy: number;
  } | null>(null);
  const selectedRef = useRef(selectedOverlayId);
  const moveRef = useRef(onMoveOverlay);
  const selectRef = useRef(onSelectOverlay);
  const placeholderRef = useRef(placeholderText);
  const size = canvasSizeForRatio(composition.ratio);

  useEffect(() => {
    compositionRef.current = composition;
    playingRef.current = playing;
    selectedRef.current = selectedOverlayId;
    moveRef.current = onMoveOverlay;
    selectRef.current = onSelectOverlay;
    placeholderRef.current = placeholderText;
  }, [composition, playing, selectedOverlayId, onMoveOverlay, onSelectOverlay, placeholderText]);

  useEffect(() => {
    clockRef.current = 0;
  }, [clockRef, composition.photos, composition.pace, composition.style, composition.endCardSeconds]);

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
      const total = compositionDuration(current).totalSeconds;
      if (playingRef.current && isCompositionPreviewReady(current)) {
        const last = lastTsRef.current;
        if (last != null) {
          clockRef.current += (ts - last) / 1000;
        }
      }
      lastTsRef.current = ts;
      clockRef.current = wrapCompositionTime(clockRef.current, total);
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#041428";
      ctx.fillRect(0, 0, w, h);
      const layouts: OverlayLayout[] = [];
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
        const activePhotoId = activePhotoIdAt(current, clockRef.current);
        for (const overlay of current.overlays) {
          if (!overlayVisibleForPhoto(overlay, activePhotoId)) continue;
          layouts.push(
            drawOverlay(
              ctx,
              overlay,
              w,
              h,
              overlay.id === selectedRef.current,
              placeholderRef.current
            )
          );
        }
        const zones = safeZones({ width: w, height: h });
        if (watermarkRef.current) drawWatermark(ctx, watermarkRef.current, zones.watermark);
      }
      layoutsRef.current = layouts;
      raf = window.requestAnimationFrame(paint);
    };
    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [clockRef, size.height, size.width]);

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      rect,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    if (!point) return;
    const hit = hitTestLayouts(layoutsRef.current, point.x, point.y);
    if (!hit) {
      selectRef.current(null);
      return;
    }
    event.preventDefault();
    const overlay = compositionRef.current.overlays.find((item) => item.id === hit);
    if (!overlay) return;
    selectRef.current(hit);
    const n = clientPointToNormalized({
      clientX: event.clientX,
      clientY: event.clientY,
      rectLeft: point.rect.left,
      rectTop: point.rect.top,
      rectWidth: point.rect.width,
      rectHeight: point.rect.height,
    });
    dragRef.current = { id: hit, originNx: n.x, originNy: n.y, startNx: overlay.x, startNy: overlay.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const n = clientPointToNormalized({
      clientX: event.clientX,
      clientY: event.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
    });
    moveRef.current(drag.id, drag.startNx + (n.x - drag.originNx), drag.startNy + (n.y - drag.originNy));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={size.width}
      height={size.height}
      data-testid="px4a-preview-canvas"
      className="mx-auto h-auto max-h-[min(70vh,640px)] w-auto max-w-full touch-none rounded-2xl bg-[#041428] shadow-lg"
      style={{ aspectRatio: `${size.width} / ${size.height}`, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
