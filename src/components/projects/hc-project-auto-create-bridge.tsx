"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  ensureHcProjectOnMotionStart,
  ensureHcProjectOnPublishStart,
  ensureHcProjectOnStudioStart,
  syncHcProjectIdToUrl,
  type HcProjectSourceModule,
} from "@/lib/hc-project-lifecycle";

type Props = {
  sourceModule: HcProjectSourceModule;
  storyboardId?: string;
  motionProjectId?: string;
  publishProjectId?: string;
};

export function HcProjectAutoCreateBridge({
  sourceModule,
  storyboardId,
  motionProjectId,
  publishProjectId,
}: Props) {
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";

  useEffect(() => {
    const ensure =
      sourceModule === "studio"
        ? ensureHcProjectOnStudioStart
        : sourceModule === "motion"
          ? ensureHcProjectOnMotionStart
          : ensureHcProjectOnPublishStart;

    const { project, created } = ensure({
      hcProjectId: hcProjectId || undefined,
      ownerId: auth.user?.id,
      syncToServer: Boolean(auth.user),
      storyboardId,
      motionProjectId,
      publishProjectId,
    });
    if (created) {
      syncHcProjectIdToUrl(project.id);
    }
  }, [
    auth.user,
    hcProjectId,
    motionProjectId,
    publishProjectId,
    sourceModule,
    storyboardId,
  ]);

  return null;
}
