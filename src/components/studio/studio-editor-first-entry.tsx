"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudioStartPage } from "@/components/studio/studio-start-page";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchStudioStoryboard } from "@/lib/studio-storyboards-client";
import {
  clearRecentStoryboardId,
  readRecentStoryboardId,
} from "@/lib/studio-recent-storyboard";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

type EntryStatus = "pending" | "redirecting" | "start";

export function StudioEditorFirstEntry() {
  const router = useRouter();
  const session = useAuthSession();
  const [status, setStatus] = useState<EntryStatus>("pending");

  useEffect(() => {
    if (!session.resolved) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!session.user) {
        if (!cancelled) {
          setStatus("start");
        }
        return;
      }

      const recentId = readRecentStoryboardId();
      if (!recentId) {
        if (!cancelled) {
          setStatus("start");
        }
        return;
      }

      if (!cancelled) {
        setStatus("redirecting");
      }

      const res = await fetchStudioStoryboard(recentId);
      if (cancelled) {
        return;
      }

      if (res.ok) {
        router.replace(studioWorkspaceHref(recentId));
        return;
      }

      clearRecentStoryboardId();
      setStatus("start");
    })();

    return () => {
      cancelled = true;
    };
  }, [session.resolved, session.user, router]);

  if (!session.resolved || status === "pending" || status === "redirecting") {
    return (
      <main className="flex-1">
        <WorkspaceLoadingSkeleton />
      </main>
    );
  }

  return <StudioStartPage />;
}
