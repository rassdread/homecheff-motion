"use client";

import { useActiveTranslator } from "@/i18n/client";
import { buildFriendlyFileDisplay } from "@/lib/editor-friendly-file-name";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  title: string;
  subtitle?: string;
  thumbnailUrl: string;
  assetType?: string;
  updatedAt?: string;
  status?: string;
  roleCompatibility?: string;
  selected?: boolean;
  onSelect?: () => void;
  selectLabel?: string;
  originalFilename?: string;
  role?: string;
};

export function StudioAssetSelectionCard({
  title,
  subtitle,
  thumbnailUrl,
  assetType,
  updatedAt,
  status,
  roleCompatibility,
  selected,
  onSelect,
  selectLabel,
  originalFilename,
  role,
}: Props) {
  const t = useActiveTranslator();
  const friendly =
    originalFilename && !subtitle
      ? buildFriendlyFileDisplay({ name: originalFilename, role, uploadedAt: updatedAt })
      : null;
  const displayTitle = title || friendly?.title || t("editor.asset.unnamed" as never);
  const displaySubtitle = subtitle ?? friendly?.subtitle ?? assetType ?? "";

  return (
    <article
      className={`flex gap-3 rounded-xl border p-3 transition ${studioVisual.editorSurface} ${
        selected ? "border-[#0067B1] ring-2 ring-[#0067B1]/25" : "border-zinc-200 hover:border-zinc-300"
      }`}
      data-testid="studio-asset-selection-card"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover sm:h-20 sm:w-20"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900">{displayTitle}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{displaySubtitle}</p>
        {status ?
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {status}
          </p>
        : null}
        {roleCompatibility ?
          <p className="mt-1 text-[10px] text-zinc-500">{roleCompatibility}</p>
        : null}
      </div>
      {onSelect ?
        <button
          type="button"
          onClick={onSelect}
          className={`shrink-0 self-center rounded-lg px-3 py-2 text-xs font-semibold ${
            selected
              ? "bg-[#0067B1] text-white"
              : "border border-[#0067B1] text-[#0067B1] hover:bg-[#0067B1]/5"
          }`}
        >
          {selectLabel ?? t("editor.asset.select" as never)}
        </button>
      : null}
    </article>
  );
}
