"use client";

import { useEffect, useState } from "react";
import {
  animationProfileHasMotion,
  motionPreviewKeyframes,
} from "@/lib/editor-object-animation";
import type {
  EditorCanvasBounds,
  EditorObjectAnimationProfile,
  EditorPartAnimationProfile,
} from "@/types/homecheff-visual-editor";

type Props = {
  bounds: EditorCanvasBounds;
  profile: EditorObjectAnimationProfile | EditorPartAnimationProfile;
  active?: boolean;
  label?: string;
};

export function EditorMotionPreviewOverlay({ bounds, profile, active = true, label }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active || !animationProfileHasMotion(profile)) {
      return;
    }
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % 60);
    }, 50);
    return () => window.clearInterval(id);
  }, [active, profile]);

  if (!active || !animationProfileHasMotion(profile)) {
    return null;
  }

  const keyframe = motionPreviewKeyframes(profile, frame);
  const left = bounds.x * 100;
  const top = bounds.y * 100;
  const width = bounds.width * 100;
  const height = bounds.height * 100;

  return (
    <div
      className="pointer-events-none absolute border-2 border-dashed border-violet-400/80 bg-violet-400/10"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        transform: `rotate(${keyframe.rotation}deg) scale(${keyframe.scale}) translateY(${keyframe.offsetY * 100}%)`,
        transformOrigin: "center center",
        transition: "transform 0.05s linear",
      }}
      aria-hidden
    >
      {label ? (
        <span className="absolute -top-5 left-0 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {label}
        </span>
      ) : null}
    </div>
  );
}
