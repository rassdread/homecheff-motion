"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { MotionStudioIntelligencePanel } from "@/components/instant/motion/motion-studio-intelligence-panel";
import type { ProjectStudioQaResponse } from "@/types/studio-project-persistence";

type Props = {
  studioQa: ProjectStudioQaResponse;
  /** Optional: warn when local draft may have newer Studio data than the server row. */
  draftOnlyWarning?: boolean;
  compact?: boolean;
};

const STATUS_CLASS: Record<ProjectStudioQaResponse["status"], string> = {
  current: "bg-emerald-50 text-emerald-900 border-emerald-200",
  stale: "bg-amber-50 text-amber-950 border-amber-200",
  missing: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function MotionProjectStudioQaPanel({
  studioQa,
  draftOnlyWarning = false,
  compact = false,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {draftOnlyWarning ?
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {t("motion.qa.server.draftOnlyWarning")}
        </p>
      : null}
      {studioQa.status === "stale" ?
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {t("motion.qa.server.staleWarning")}
        </p>
      : null}
      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/30">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="text-sm font-semibold text-violet-950">
            {t("motion.qa.server.panelTitle")}
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[studioQa.status]}`}
            >
              {t(`motion.qa.server.status.${studioQa.status}`)}
            </span>
            <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
          </span>
        </button>
        {open ?
          <div className="space-y-3 border-t border-violet-200/60 px-4 py-4">
            <p className="text-xs text-zinc-600">
              {t("motion.qa.source.storyboard")}:{" "}
              <span className="font-medium text-zinc-900">{studioQa.source.storyboardTitle}</span>
              {!compact ?
                <>
                  {" "}
                  <Link
                    href={`/studio/storyboards/${encodeURIComponent(studioQa.source.storyboardId)}`}
                    className="text-[#006D52] underline"
                  >
                    {t("motion.qa.importSummary.openStoryboard")}
                  </Link>
                </>
              : null}
            </p>
            <MotionStudioIntelligencePanel
              intelligence={studioQa.intelligence}
              readiness={studioQa.readiness}
            />
          </div>
        : null}
      </div>
    </div>
  );
}
