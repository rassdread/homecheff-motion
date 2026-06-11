"use client";

import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  title: string;
  typeLabel: string;
  statusLabel?: string;
  modifiedLabel?: string;
  thumbnailUrl?: string | null;
  thumbnailFallback?: string;
  selected?: boolean;
  onClick?: () => void;
  as?: "button" | "div";
};

export function StudioLibraryCard({
  title,
  typeLabel,
  statusLabel,
  modifiedLabel,
  thumbnailUrl,
  thumbnailFallback = "—",
  selected = false,
  onClick,
  as = "button",
}: Props) {
  const className = `flex min-h-[132px] w-full flex-col rounded-xl border p-3 text-left transition ${
    selected
      ? "border-[#006D52]/50 bg-[#006D52]/8 ring-1 ring-[#006D52]/25"
      : "border-zinc-300/90 bg-white hover:border-[#0067B1]/30 hover:shadow-sm"
  } ${studioVisual.editorSurface}`;

  const content = (
    <>
      {thumbnailUrl ?
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="mb-2 h-20 w-full rounded-lg object-cover"
        />
      : (
        <span className="mb-2 flex h-20 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {thumbnailFallback}
        </span>
      )}
      <span className="line-clamp-2 text-sm font-bold text-zinc-900">{title}</span>
      <span className="mt-1 text-xs font-medium text-zinc-700">{typeLabel}</span>
      {modifiedLabel ?
        <span className="mt-0.5 text-[11px] text-zinc-600">{modifiedLabel}</span>
      : null}
      {statusLabel ?
        <span className="mt-1 inline-flex w-fit rounded-full border border-zinc-300/80 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-800">
          {statusLabel}
        </span>
      : null}
    </>
  );

  if (as === "div") {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
