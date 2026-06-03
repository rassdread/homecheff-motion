"use client";

import Image from "next/image";
import { useState } from "react";
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
  expiredLabelKey?: string;
};

function placeholderShell(
  className: string,
  fill: boolean | undefined,
  ariaLabel: string,
  label: string
) {
  return (
    <div
      className={[className, fill ? "absolute inset-0" : ""].filter(Boolean).join(" ")}
      role="img"
      aria-label={ariaLabel}
    >
      {label}
    </div>
  );
}

export function SafePreviewImage({
  src,
  image,
  prefer = "working",
  alt = "",
  placeholderClassName = "flex h-full w-full items-center justify-center bg-zinc-100 px-2 text-center text-[10px] leading-snug text-zinc-500",
  invalidLabelKey = "instant.preview.expiredReupload",
  expiredLabelKey = "instant.preview.expiredReupload",
  className,
  ...imageProps
}: SafePreviewImageProps) {
  const t = useActiveTranslator();
  const [loadFailed, setLoadFailed] = useState(false);
  const resolved = image
    ? resolvePreviewSrc(image, prefer)
    : resolvePreviewSrcFromUnknown(src);
  const labelKey = image?.previewUnavailable ? expiredLabelKey : invalidLabelKey;
  const label = t(labelKey as never);

  if (!resolved || loadFailed) {
    return placeholderShell(
      placeholderClassName,
      imageProps.fill,
      alt || label,
      label
    );
  }

  const useNativeImg =
    resolved.startsWith("blob:") || resolved.startsWith("data:image/");

  if (useNativeImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        className={[
          className,
          imageProps.fill ? "absolute inset-0 h-full w-full object-cover" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <Image
      {...imageProps}
      src={resolved}
      alt={alt}
      className={className}
      unoptimized
      onError={() => setLoadFailed(true)}
    />
  );
}
