"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HcProjectAutoCreateBridge } from "@/components/projects/hc-project-auto-create-bridge";
import { HcProjectWorkspaceControls } from "@/components/projects/hc-project-workspace-controls";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { useAuthSession } from "@/hooks/use-auth-session";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { useMemo, useState } from "react";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

function HcInstantProjectBarInner() {
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const [project, setProject] = useState<HomeCheffProjectPackage | null>(() =>
    hcProjectId ? loadHomeCheffProject(hcProjectId) : null
  );

  const loaded = useMemo(() => {
    if (project) {
      return project;
    }
    if (!hcProjectId) {
      return null;
    }
    return loadHomeCheffProject(hcProjectId);
  }, [hcProjectId, project]);

  return (
    <>
      <HcProjectAutoCreateBridge sourceModule="motion" />
      {loaded ?
        <HcProjectWorkspaceControls
          project={loaded}
          onProjectChange={setProject}
          sourceModule="motion"
          ownerId={auth.user?.id}
          syncToServer={Boolean(auth.user)}
          closeHref="/motion"
        />
      : hcProjectId ?
        <div className="border-b border-sky-100 bg-sky-50/50 px-4 py-2">
          <HcProjectStateBadge
            project={{ id: hcProjectId, projectType: "motion", title: "" } as never}
            compact
          />
        </div>
      : null}
    </>
  );
}

export function HcInstantProjectBar() {
  return (
    <Suspense fallback={null}>
      <HcInstantProjectBarInner />
    </Suspense>
  );
}
