"use client";

import type { ComponentPropsWithoutRef } from "react";

/** Main hero preview on project detail / progress — contained, 9:16, viewport-capped. */
export const VIDEO_PREVIEW_MAIN_FRAME_CLASS =
  "relative mx-auto w-full max-w-[min(100%,calc(65vh*9/16))] max-h-[55vh] md:max-h-[65vh] aspect-[9/16]";

export const VIDEO_PREVIEW_MAIN_VIDEO_CLASS =
  "absolute inset-0 h-full w-full rounded-xl bg-black object-contain";

/** Smaller previews in version cards. */
export const VIDEO_PREVIEW_VERSION_FRAME_CLASS =
  "relative mx-auto mt-3 w-full max-w-sm max-h-[320px] md:max-h-[360px] aspect-[9/16]";

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
  ...videoProps
}: VideoPreviewProps) {
  const frameClass =
    variant === "version" ? VIDEO_PREVIEW_VERSION_FRAME_CLASS : VIDEO_PREVIEW_MAIN_FRAME_CLASS;
  const videoClass =
    variant === "version" ? VIDEO_PREVIEW_VERSION_VIDEO_CLASS : VIDEO_PREVIEW_MAIN_VIDEO_CLASS;

  return (
    <div className={[frameClass, frameClassName].filter(Boolean).join(" ")}>
      <video
        {...videoProps}
        className={[videoClass, className].filter(Boolean).join(" ")}
      >
        {children}
      </video>
    </div>
  );
}
