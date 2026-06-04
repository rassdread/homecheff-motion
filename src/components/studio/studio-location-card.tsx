"use client";

import Link from "next/link";
import { StudioLocationCategoryBadge } from "@/components/studio/studio-location-category-badge";
import { AppCard } from "@/components/ui/app-card";
import { truncateStudioText } from "@/lib/studio-asset-text";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioLocationListItem } from "@/types/studio-api";

type StudioLocationCardProps = {
  location: StudioLocationListItem;
  onDelete: (id: string) => void;
  deleteBusyId: string | null;
  canModify: boolean;
};

export function StudioLocationCard({
  location,
  onDelete,
  deleteBusyId,
  canModify,
}: StudioLocationCardProps) {
  const t = useActiveTranslator();
  const busy = deleteBusyId === location.id;

  return (
    <AppCard className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[4/3] w-full bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.referenceImageUrl}
          alt={location.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">{location.name}</h3>
          <StudioLocationCategoryBadge category={location.category} />
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
          {truncateStudioText(location.description, 140)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/studio/locations/${location.id}`}
            prefetch={false}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.locations.action.view")}
          </Link>
          {canModify ? (
            <>
              <Link
                href={`/studio/locations/${location.id}/edit`}
                prefetch={false}
                className="rounded-full border border-[#0067B1]/40 px-3 py-1.5 text-xs font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
              >
                {t("studio.locations.action.edit")}
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(location.id)}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy ? t("button.loading") : t("studio.locations.action.delete")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </AppCard>
  );
}
