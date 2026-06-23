"use client";

import { Suspense } from "react";
import { MotionStudioHub } from "@/components/motion/motion-studio-hub";

export default function MotionPage() {
  return (
    <Suspense fallback={null}>
      <MotionStudioHub />
    </Suspense>
  );
}
