"use client";

import { useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { compositionDuration, includedPhotos, isCompositionPreviewReady } from "@/lib/photo-video/composition";
import { wrapCompositionTime } from "@/lib/photo-video/clock";
import { PHOTO_VIDEO_WATERMARK_SRC, type PhotoVideoContext } from "@/lib/photo-video/constants";
import { canvasSizeForRatio } from "@/lib/photo-video/layout";
import { clientPointToNormalized, hitTestLayouts } from "@/lib/photo-video/text-overlay";
import {
  drawPhotoVideoFrame,
  loadPhotoVideoImage,
  type OverlayLayout,
  type PhotoVideoImageCache,
} from "@/lib/photo-video/render-frame";

export function PhotoVideoPreviewCanvas({
  composition,
  playing,
  clockRef,
  selectedOverlayId,
  placeholderText,
  context = "studio",
  onSelectOverlay,
  onMoveOverlay,
}: {
  composition: PhotoVideoComposition;
  playing: boolean;
  clockRef: MutableRefObject<number>;
  selectedOverlayId: string | null;
  placeholderText: string;
  context?: PhotoVideoContext;
  onSelectOverlay: (id: string | null) => void;
  onMoveOverlay: (id: string, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<PhotoVideoImageCache>(new Map());
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
  const contextRef = useRef(context);
  const size = canvasSizeForRatio(composition.ratio);

  useEffect(() => {
    compositionRef.current = composition;
    playingRef.current = playing;
    selectedRef.current = selectedOverlayId;
    moveRef.current = onMoveOverlay;
    selectRef.current = onSelectOverlay;
    placeholderRef.current = placeholderText;
    contextRef.current = context;
  }, [composition, playing, selectedOverlayId, onMoveOverlay, onSelectOverlay, placeholderText, context]);

  useEffect(() => {
    clockRef.current = 0;
  }, [clockRef, composition.photos, composition.pace, composition.style, composition.endCardSeconds]);

  useEffect(() => {
    const cache = cacheRef.current;
    const urls = includedPhotos(composition).map((photo) => photo.previewUrl);
    void Promise.all(urls.map((url) => loadPhotoVideoImage(url, cache).catch(() => null)));
  }, [composition]);

  useEffect(() => {
    let cancelled = false;
    void loadPhotoVideoImage(PHOTO_VIDEO_WATERMARK_SRC, cacheRef.current)
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
      const draftContext = contextRef.current;
      const total = compositionDuration(current, draftContext).totalSeconds;
      if (playingRef.current && isCompositionPreviewReady(current, draftContext)) {
        const last = lastTsRef.current;
        if (last != null) {
          clockRef.current += (ts - last) / 1000;
        }
      }
      lastTsRef.current = ts;
      clockRef.current = wrapCompositionTime(clockRef.current, total);
      layoutsRef.current = drawPhotoVideoFrame({
        ctx,
        composition: current,
        context: draftContext,
        timeSeconds: clockRef.current,
        images: cacheRef.current,
        watermark: watermarkRef.current,
        selectedOverlayId: selectedRef.current,
        placeholderText: placeholderRef.current,
        drawSelection: true,
      });
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
