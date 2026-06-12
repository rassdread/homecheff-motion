import type { MotionIntentId } from "@/components/motion/motion-intent-gate";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";

export function storeMotionIntentInHc(
  project: HomeCheffProjectPackage,
  intent: MotionIntentId
): HomeCheffProjectPackage {
  return {
    ...project,
    workflowState: { ...project.workflowState, motionIntent: intent },
    servicePayload: {
      ...project.servicePayload,
      motion: {
        ...project.servicePayload.motion,
        metadata: {
          ...project.servicePayload.motion?.metadata,
          motionIntent: intent,
        },
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function readMotionIntentFromHc(project: HomeCheffProjectPackage | null): MotionIntentId | null {
  if (!project) return null;
  const fromState = project.workflowState.motionIntent;
  if (typeof fromState === "string") return fromState as MotionIntentId;
  const fromMeta = project.servicePayload.motion?.metadata?.motionIntent;
  if (typeof fromMeta === "string") return fromMeta as MotionIntentId;
  return null;
}

export function persistMotionIntentToHc(
  project: HomeCheffProjectPackage,
  intent: MotionIntentId,
  options: { syncToServer?: boolean } = {}
): HomeCheffProjectPackage {
  return persistHcProjectWithSync(storeMotionIntentInHc(project, intent), options);
}
