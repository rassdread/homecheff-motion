"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { listRecentLocalEdits, saveLocalEditAsHcProject } from "@/lib/recent-local-edits";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  onSavedAsProject?: () => void;
};

export function RecentLocalEditsPanel({ onSavedAsProject }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const auth = useAuthSession();
  const [status, setStatus] = useState<string | null>(null);
  const items = useMemo(() => listRecentLocalEdits(), []);

  if (items.length === 0) {
    return null;
  }

  const saveAsProject = (sessionId: string) => {
    const result = saveLocalEditAsHcProject({
      sessionId,
      ownerId: auth.user?.id,
      syncToServer: Boolean(auth.user),
    });
    if (!result.ok) {
      setStatus("projects.hub.recentEdits.saveFailed");
      return;
    }
    setStatus("hcProject.save.localSavedAsProjectDone");
    onSavedAsProject?.();
    router.push(`/projects?highlight=${encodeURIComponent(result.projectId)}`);
  };

  return (
    <section className="mt-8" data-testid="recent-local-edits-panel">
      <h2 className={`text-sm font-bold ${studioVisual.subheadingOnDark}`}>
        {t("projects.hub.section.localEdits" as never)}
      </h2>
      <p className={`mt-1 text-xs ${studioVisual.bodyOnDark}`}>{t("projects.hub.section.localEditsLead" as never)}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const updatedLabel = new Date(item.updatedAt).toLocaleString();
          const duplicateHint =
            item.nameOccurrenceTotal > 1
              ? t("projects.hub.recentEdits.duplicateHint" as never, {
                  index: String(item.nameOccurrence),
                  total: String(item.nameOccurrenceTotal),
                  date: updatedLabel,
                } as never)
              : updatedLabel;

          return (
            <li
              key={item.sessionId}
              className={`flex flex-wrap items-center justify-between gap-3 p-4 ${studioVisual.cardOnDarkMuted}`}
              data-testid={`recent-local-edit-${item.sessionId}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {t(`projects.hub.recentEdits.type.${item.type}` as never)} ·{" "}
                  {t(`projects.hub.recentEdits.storage.${item.storage}` as never)} · {duplicateHint}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/editor?session=${encodeURIComponent(item.sessionId)}`}
                  className={studioVisual.btnGradientPrimary}
                >
                  {t("projects.hub.recentEdits.open" as never)}
                </Link>
                {item.storage === "linked" && item.hcProjectId ?
                  <Link href={`/projects`} className={studioVisual.btnOutline}>
                    {t("projects.hub.recentEdits.openProject" as never)}
                  </Link>
                : (
                  <button type="button" className={studioVisual.btnOutline} onClick={() => saveAsProject(item.sessionId)}>
                    {t("projects.hub.recentEdits.saveAsProject" as never)}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {status ?
        <p className="mt-2 text-xs text-emerald-800">{t(status as never)}</p>
      : null}
    </section>
  );
}
