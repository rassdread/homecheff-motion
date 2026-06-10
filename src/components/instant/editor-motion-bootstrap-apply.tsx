"use client";

import { Suspense } from "react";
import { useEditorMotionBootstrapApply } from "@/hooks/use-editor-motion-bootstrap-apply";
import type { WizardSceneSlot } from "@/lib/instant-wizard-scene-slots";
import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";

type Props = {
  sceneSlots: WizardSceneSlot[];
  setSceneSlots: (updater: (prev: WizardSceneSlot[]) => WizardSceneSlot[]) => void;
  transitionSeconds: InstantTransitionSeconds;
  instantMode: InstantMode;
};

function EditorMotionBootstrapApplyInner(props: Props) {
  useEditorMotionBootstrapApply(props);
  return null;
}

export function EditorMotionBootstrapApply(props: Props) {
  return (
    <Suspense fallback={null}>
      <EditorMotionBootstrapApplyInner {...props} />
    </Suspense>
  );
}
