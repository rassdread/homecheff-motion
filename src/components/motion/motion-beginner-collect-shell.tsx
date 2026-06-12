"use client";

import { ReactNode, useState } from "react";
import {
  MotionIntentGate,
  readMotionIntent,
  storeMotionIntent,
  type MotionIntentId,
} from "@/components/motion/motion-intent-gate";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { persistMotionIntentToHc, readMotionIntentFromHc } from "@/lib/motion-hc-intent";

type Props = {
  beginnerMode: boolean;
  hcProjectId?: string;
  children: ReactNode;
};

function resolveHcProjectId(propId?: string): string | undefined {
  if (propId) return propId;
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("hcProject")?.trim() || undefined;
}

export function MotionBeginnerCollectShell({ beginnerMode, hcProjectId: hcProjectIdProp, children }: Props) {
  const hcProjectId = resolveHcProjectId(hcProjectIdProp);

  const [intent, setIntent] = useState<MotionIntentId | null>(() => {
    if (!beginnerMode) return "product";
    if (hcProjectId) {
      const fromHc = readMotionIntentFromHc(loadHomeCheffProject(hcProjectId));
      if (fromHc) return fromHc;
    }
    return readMotionIntent();
  });

  if (beginnerMode && !intent) {
    return (
      <MotionIntentGate
        onSelect={(value) => {
          storeMotionIntent(value);
          if (hcProjectId) {
            const project = loadHomeCheffProject(hcProjectId);
            if (project) persistMotionIntentToHc(project, value, { syncToServer: true });
          }
          setIntent(value);
        }}
      />
    );
  }

  return <>{children}</>;
}
