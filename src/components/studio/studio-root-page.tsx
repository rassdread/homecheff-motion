"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShellEmptyView } from "@/components/studio/studio-shell-empty-view";
import { StudioWorkspaceShell } from "@/components/studio/studio-workspace-shell";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  clearRecentStoryboardId,
  readRecentStoryboardId,
} from "@/lib/studio-recent-storyboard";
import { fetchStudioStoryboard } from "@/lib/studio-storyboards-client";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

function StudioRootContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  const [resolvingRecent, setResolvingRecent] = useState(() => !storyboardId);

  useEffect(() => {
    if (storyboardId || !session.resolved) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!session.user) {
        if (!cancelled) {
          setResolvingRecent(false);
        }
        return;
      }

      const recentId = readRecentStoryboardId();
      if (!recentId) {
        if (!cancelled) {
          setResolvingRecent(false);
        }
        return;
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
      setResolvingRecent(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [storyboardId, session.resolved, session.user, router]);

  if (storyboardId) {
    return <StudioWorkspaceShell storyboardId={storyboardId} />;
  }

  if (!session.resolved || resolvingRecent) {
    return (
      <main className="flex-1">
        <WorkspaceLoadingSkeleton />
      </main>
    );
  }

  return <StudioShellEmptyView />;
}

export function StudioRootPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <WorkspaceLoadingSkeleton />
        </main>
      }
    >
      <StudioRootContent />
    </Suspense>
  );
}
