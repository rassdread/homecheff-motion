"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioProductionCenter } from "@/components/studio/studio-production-center";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import { fetchStudioStoryboard } from "@/lib/studio-storyboards-client";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export default function StudioProductionPage() {
  const t = useActiveTranslator();
  const params = useParams();
  const storyboardId = typeof params.id === "string" ? params.id : "";
  const session = useAuthSession();
  const [storyboard, setStoryboard] = useState<StudioStoryboardDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storyboardId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetchStudioStoryboard(storyboardId);
    if (res.ok && res.data.storyboard) {
      setStoryboard(res.data.storyboard);
    } else {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.loadFailed"));
      setStoryboard(null);
    }
    setLoading(false);
  }, [storyboardId, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  return (
    <StudioAuthGate>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link
          href={studioWorkspaceHref(storyboardId)}
          className="text-sm font-medium text-zinc-600 underline"
        >
          {t("studio.production.backToStoryboard")}
        </Link>

        {loading ?
          <p className="mt-8 text-sm text-zinc-600">{t("studio.production.loading")}</p>
        : error ?
          <p className="mt-8 text-sm text-red-700">{error}</p>
        : storyboard ?
          <div className="mt-6">
            <StudioProductionCenter
              storyboard={storyboard}
              storyboardId={storyboardId}
              layout="page"
            />
          </div>
        : null}
      </main>
    </StudioAuthGate>
  );
}
