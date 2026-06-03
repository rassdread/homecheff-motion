"use client";

import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  resolvePreviewSrc,
  resolvePreviewSrcFromUnknown,
  type WizardPreviewImageInput,
} from "@/lib/instant-wizard-preview-src";

type SafePreviewImageProps = Omit<ComponentPropsWithoutRef<typeof Image>, "src" | "alt"> & {
  src?: unknown;
  image?: WizardPreviewImageInput;
  prefer?: "working" | "thumbnail";
  alt?: string;
  placeholderClassName?: string;
  invalidLabelKey?: string;
};

export function SafePreviewImage({
  src,
  image,
  prefer = "working",
  alt = "",
  placeholderClassName = "flex h-full w-full items-center justify-center bg-zinc-100 px-2 text-center text-[10px] text-zinc-500",
  invalidLabelKey = "instant.preview.imageUnavailable",
  className,
  ...imageProps
}: SafePreviewImageProps) {
  const t = useActiveTranslator();
  const resolved = image
    ? resolvePreviewSrc(image, prefer)
    : resolvePreviewSrcFromUnknown(src);

  if (!resolved) {
    return (
      <div
        className={[
          placeholderClassName,
          imageProps.fill ? "absolute inset-0" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="img"
        aria-label={alt || t(invalidLabelKey as never)}
      >
        {t(invalidLabelKey as never)}
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      src={resolved}
      alt={alt}
      className={className}
      unoptimized
      onError={(event) => {
        event.currentTarget.style.display = "none";
        imageProps.onError?.(event);
      }}
    />
  );
}
