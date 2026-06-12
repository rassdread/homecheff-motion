"use client";

import { SuiteFlowActions } from "@/components/suite/suite-flow-actions";
import { buildMotionRenderNextActions } from "@/lib/suite-flow-handoffs";

type Props = {
  projectId: string;
  videoUrl?: string | null;
  titleKey?: string;
  hcProjectId?: string;
};

export function MotionPublishHandoff({ projectId, videoUrl, titleKey = "suite.flow.motionCompleteTitle", hcProjectId }: Props) {
  if (!videoUrl?.trim()) {
    return null;
  }
  return (
    <SuiteFlowActions
      titleKey={titleKey}
      actions={buildMotionRenderNextActions({ projectId, videoUrl: videoUrl.trim(), hcProjectId })}
    />
  );
}
