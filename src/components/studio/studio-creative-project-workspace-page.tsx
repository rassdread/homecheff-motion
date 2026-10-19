"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioUnifiedProjectWorkspace } from "@/components/studio/studio-unified-project-workspace";
import { useActiveTranslator } from "@/i18n/client";
import type { ProjectWorkspaceView } from "@/lib/studio-project-workspace";

export function StudioCreativeProjectWorkspacePage() {
  const t = useActiveTranslator();
  const params = useParams<{ projectId: string }>();
  const search = useSearchParams();
  const projectId = params.projectId;
  const [workspace, setWorkspace] = useState<ProjectWorkspaceView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/studio/projects/${projectId}/workspace`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { workspace?: ProjectWorkspaceView; error?: string };
        if (cancelled) return;
        if (!response.ok || !body.workspace) {
          setError(t("studio.workspace.v12.loadFailed"));
          return;
        }
        setWorkspace(body.workspace);
      })
      .catch(() => {
        if (!cancelled) setError(t("studio.workspace.v12.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, t]);

  return (
    <StudioAuthGate>
      {error ? <p className="mx-auto max-w-xl px-6 py-16 text-sm text-red-200">{error}</p> : null}
      {!workspace && !error ? <p className="px-6 py-16 text-sm text-white/80">{t("studio.workspace.v12.loading")}</p> : null}
      {workspace ? (
        <StudioUnifiedProjectWorkspace workspace={workspace} initialSection={search.get("section")} />
      ) : null}
    </StudioAuthGate>
  );
}
