"use client";

import { useSearchParams } from "next/navigation";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";

export function HcInstantProjectBar() {
  const searchParams = useSearchParams();
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const project = hcProjectId ? loadHomeCheffProject(hcProjectId) : null;
  if (!project) return null;
  return (
    <div className="border-b border-sky-100 bg-sky-50/50 px-4 py-2">
      <HcProjectStateBadge project={project} compact />
    </div>
  );
}
