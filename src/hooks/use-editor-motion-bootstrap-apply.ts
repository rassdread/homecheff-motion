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
    if (!bootstrap?.imageUrls.length) {
      return;
    }
    const applyKey = `${bootstrap.sessionId}:${bootstrap.imageUrls.join("|")}`;
    if (appliedKeyRef.current === applyKey) {
      return;
    }
    const images = bootstrap.imageUrls
      .map((url, index) =>
        mapEditorMotionBootstrapToWizardImage({
          ...bootstrap,
          imageUrl: url,
          sessionId: bootstrap.sessionId,
          assetId: index > 0 ? `${bootstrap.assetId ?? "layer"}-${index}` : bootstrap.assetId,
        })
      )
      .filter((image): image is NonNullable<typeof image> => Boolean(image));
    if (images.length === 0) {
      return;
    }
    const alreadyAttached = images.every((image) =>
      sceneSlots.some((slot) => slot.image?.remoteWorkingUrl === image.remoteWorkingUrl)
    );
    if (alreadyAttached) {
      appliedKeyRef.current = applyKey;
      return;
    }
    setSceneSlots((prev) =>
      syncAutoEmotionsForSceneSlots(
        assignImagesToSceneSlots(prev, images, transitionSeconds),
        instantMode
      )
    );
    appliedKeyRef.current = applyKey;
  }, [bootstrap, instantMode, sceneSlots, setSceneSlots, transitionSeconds]);
}
