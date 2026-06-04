"use client";

import Link from "next/link";
import { StudioPropCategoryBadge } from "@/components/studio/studio-prop-category-badge";
import { AppCard } from "@/components/ui/app-card";
import { truncateStudioText } from "@/lib/studio-asset-text";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioPropListItem } from "@/types/studio-api";

type StudioPropCardProps = {
  prop: StudioPropListItem;
  onDelete: (id: string) => void;
  deleteBusyId: string | null;
  canModify: boolean;
};

export function StudioPropCard({ prop, onDelete, deleteBusyId, canModify }: StudioPropCardProps) {
  const t = useActiveTranslator();
  const busy = deleteBusyId === prop.id;

  return (
    <AppCard className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[4/3] w-full bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={prop.referenceImageUrl} alt={prop.name} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">{prop.name}</h3>
          <StudioPropCategoryBadge category={prop.category} />
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
          {truncateStudioText(prop.description, 140)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/studio/props/${prop.id}`}
            prefetch={false}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.props.action.view")}
          </Link>
          {canModify ? (
            <>
              <Link
                href={`/studio/props/${prop.id}/edit`}
                prefetch={false}
                className="rounded-full border border-[#0067B1]/40 px-3 py-1.5 text-xs font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
              >
                {t("studio.props.action.edit")}
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(prop.id)}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy ? t("button.loading") : t("studio.props.action.delete")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </AppCard>
  );
}
