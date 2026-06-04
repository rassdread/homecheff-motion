"use client";

import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

export type ProjectDetailModeKind = "story" | "transition" | "classic";

type ProjectDetailHeaderProps = {
  title: string;
  statusLabelKey: TranslationKey;
  createdAtIso: string;
  mode: ProjectDetailModeKind;
  backHref?: string;
  onRename?: () => void;
};

export function projectDetailModeLabelKey(mode: ProjectDetailModeKind): TranslationKey {
  if (mode === "story") {
    return "projectDetail.mode.story";
  }
  if (mode === "transition") {
    return "projectDetail.mode.transition";
  }
  return "projectDetail.mode.classic";
}

export function ProjectDetailHeader({
  title,
  statusLabelKey,
  createdAtIso,
  mode,
  backHref = "/videos",
  onRename,
}: ProjectDetailHeaderProps) {
  const t = useActiveTranslator();

  return (
    <header className="space-y-3">
      <a href={backHref} className="inline-block text-sm font-medium text-emerald-800 hover:underline">
        {t("videos.title")}
      </a>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="text-xl font-semibold leading-snug text-zinc-900 sm:text-2xl">{title}</h1>
            {onRename ? (
              <button
                type="button"
                onClick={onRename}
                className="text-xs font-medium text-emerald-800 underline decoration-emerald-700/40 hover:text-emerald-950"
              >
                {t("videos.rename.action")}
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            <ClientFormattedDateTime iso={createdAtIso} />
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">
          {t(statusLabelKey)}
        </span>
      </div>
      <p className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-950">
        {t(projectDetailModeLabelKey(mode))}
      </p>
    </header>
  );
}
