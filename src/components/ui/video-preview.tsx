"use client";

import type { ComponentPropsWithoutRef } from "react";
import { resolvePlayableVideoSrc } from "@/lib/playable-media-url";

/**
 * Viewport caps for 9:16 previews — mobile 60vh, tablet 50vh, desktop 40vh.
 * Width follows height so the full frame stays visible with object-contain.
 */
export const VIDEO_PREVIEW_VIEWPORT_CAP_CLASSES =
  "max-h-[60vh] md:max-h-[50vh] lg:max-h-[40vh] max-w-[min(100%,calc(60vh*9/16))] md:max-w-[min(100%,calc(50vh*9/16))] lg:max-w-[min(100%,calc(40vh*9/16))]";

/** Main hero preview on project detail / progress — contained 9:16, viewport-capped. */
export const VIDEO_PREVIEW_MAIN_FRAME_CLASS =
  `relative mx-auto w-full aspect-[9/16] ${VIDEO_PREVIEW_VIEWPORT_CAP_CLASSES}`;

export const VIDEO_PREVIEW_MAIN_VIDEO_CLASS =
  "absolute inset-0 h-full w-full rounded-xl bg-black object-contain";

/** Version cards, gallery rows, segment clips — same viewport caps, narrower max width. */
export const VIDEO_PREVIEW_VERSION_FRAME_CLASS =
  `relative mx-auto mt-3 w-full max-w-sm aspect-[9/16] ${VIDEO_PREVIEW_VIEWPORT_CAP_CLASSES}`;

export const VIDEO_PREVIEW_VERSION_VIDEO_CLASS =
  "absolute inset-0 h-full w-full rounded-xl bg-black/5 object-contain";

export type VideoPreviewVariant = "main" | "version";

type VideoPreviewProps = Omit<ComponentPropsWithoutRef<"video">, "className"> & {
  variant?: VideoPreviewVariant;
  className?: string;
  frameClassName?: string;
};

export function VideoPreview({
  variant = "main",
  className,
  frameClassName,
  children,
  src,
  ...videoProps
}: VideoPreviewProps) {
  const frameClass =
    variant === "version" ? VIDEO_PREVIEW_VERSION_FRAME_CLASS : VIDEO_PREVIEW_MAIN_FRAME_CLASS;
  const videoClass =
    variant === "version" ? VIDEO_PREVIEW_VERSION_VIDEO_CLASS : VIDEO_PREVIEW_MAIN_VIDEO_CLASS;

  const playableSrc = resolvePlayableVideoSrc(typeof src === "string" ? src : undefined);
  if (!playableSrc) {
    return null;
  }

  return (
    <div className={[frameClass, frameClassName].filter(Boolean).join(" ")}>
      <video
        {...videoProps}
        src={playableSrc}
        className={[videoClass, className].filter(Boolean).join(" ")}
      >
        {children}
      </video>
    </div>
  );
}
