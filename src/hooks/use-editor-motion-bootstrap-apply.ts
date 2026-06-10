"use client";

import { useEffect, useRef } from "react";
import { useEditorMotionBootstrap } from "@/hooks/use-editor-motion-bootstrap";
import { mapEditorMotionBootstrapToWizardImage } from "@/lib/editor-motion-bootstrap-image";
import {
  assignImagesToSceneSlots,
  syncAutoEmotionsForSceneSlots,
  type WizardSceneSlot,
} from "@/lib/instant-wizard-scene-slots";
import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";

type Params = {
  sceneSlots: WizardSceneSlot[];
  setSceneSlots: (updater: (prev: WizardSceneSlot[]) => WizardSceneSlot[]) => void;
  transitionSeconds: InstantTransitionSeconds;
  instantMode: InstantMode;
};

export function useEditorMotionBootstrapApply({
  sceneSlots,
  setSceneSlots,
  transitionSeconds,
  instantMode,
}: Params): void {
  const bootstrap = useEditorMotionBootstrap();
  const appliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bootstrap?.imageUrl) {
      return;
    }
    const applyKey = `${bootstrap.sessionId}:${bootstrap.imageUrl}`;
    if (appliedKeyRef.current === applyKey) {
      return;
    }
    const image = mapEditorMotionBootstrapToWizardImage(bootstrap);
    if (!image) {
      return;
    }
    const alreadyAttached = sceneSlots.some(
      (slot) => slot.image?.remoteWorkingUrl === bootstrap.imageUrl
    );
    if (alreadyAttached) {
      appliedKeyRef.current = applyKey;
      return;
    }
    setSceneSlots((prev) =>
      syncAutoEmotionsForSceneSlots(
        assignImagesToSceneSlots(prev, [image], transitionSeconds),
        instantMode
      )
    );
    appliedKeyRef.current = applyKey;
  }, [bootstrap, instantMode, sceneSlots, setSceneSlots, transitionSeconds]);
}
