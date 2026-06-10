"use client";

import { Suspense } from "react";
import { useEditorMotionBootstrap } from "@/hooks/use-editor-motion-bootstrap";

function EditorMotionBootstrapInner() {
  useEditorMotionBootstrap();
  return null;
}

export function EditorMotionBootstrapBridge() {
  return (
    <Suspense fallback={null}>
      <EditorMotionBootstrapInner />
    </Suspense>
  );
}
