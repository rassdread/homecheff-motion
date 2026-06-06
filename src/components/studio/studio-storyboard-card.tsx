"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { truncateStudioText } from "@/lib/studio-asset-text";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioStoryboardListItem } from "@/types/studio-api";

type StudioStoryboardCardProps = {
  storyboard: StudioStoryboardListItem;
  onDelete: (id: string) => void;
  deleteBusyId: string | null;
  canModify: boolean;
};

export function StudioStoryboardCard({
  storyboard,
  onDelete,
  deleteBusyId,
  canModify,
}: StudioStoryboardCardProps) {
  const t = useActiveTranslator();
  const busy = deleteBusyId === storyboard.id;
  const created = new Date(storyboard.createdAt).toLocaleDateString();

  return (
    <AppCard className="flex h-full flex-col p-5">
      <h3 className="text-lg font-semibold text-zinc-900">{storyboard.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
        {truncateStudioText(storyboard.description, 160) ||
          t("studio.storyboards.noDescription")}
      </p>
      <p className="mt-3 text-xs text-zinc-500">
        {t("studio.storyboards.meta.sceneCount", { count: String(storyboard.sceneCount) })}
        {" · "}
        {t("studio.storyboards.meta.created", { date: created })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={studioWorkspaceHref(storyboard.id)}
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-full bg-[#006D52] px-4 text-xs font-semibold text-white hover:opacity-90"
        >
          {t("studio.storyboards.action.open")}
        </Link>
        {canModify ? (
          <>
            <Link
              href={`/studio/storyboards/${storyboard.id}/edit`}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full border border-[#0067B1]/40 px-4 text-xs font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
            >
              {t("studio.storyboards.action.edit")}
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(storyboard.id)}
              className="inline-flex min-h-11 items-center rounded-full border border-red-200 px-4 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {busy ? t("button.loading") : t("studio.storyboards.action.delete")}
            </button>
          </>
        ) : null}
      </div>
    </AppCard>
  );
}
